import { SlashCommandBuilder } from 'discord.js';
import { successEmbed, warningEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { botConfig } from '../../config/bot.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const COOLDOWN = 30 * 60 * 1000;
const MIN_WIN = 50;
const MAX_WIN = 200;
const SUCCESS_CHANCE = 0.7;

export default {
    data: new SlashCommandBuilder()
        .setName('żebrać')
        .setDescription('Zacznij żebrać o niewielką kwotę pieniędzy'),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;
            
            const userId = interaction.user.id;
            const guildId = interaction.guildId;

            let userData = await getEconomyData(client, guildId, userId);
            
            if (!userData) {
                throw createError(
                    "Nie udało się wczytać danych ekonomicznych",
                    ErrorTypes.DATABASE,
                    "Nie udało się wczytać danych dotyczących Twojej ekonomii. Spróbuj ponownie później.",
                    { userId, guildId }
                );
            }

            const lastBeg = userData.lastBeg || 0;
            const remainingTime = lastBeg + COOLDOWN - Date.now();

            if (remainingTime > 0) {
                const minutes = Math.floor(remainingTime / 60000);
                const seconds = Math.floor((remainingTime % 60000) / 1000);

                let timeMessage =
                    minutes > 0 ? `${minutes} minute(s)` : `${seconds} second(s)`;

                throw createError(
                    "Beg cooldown active",
                    ErrorTypes.RATE_LIMIT,
                    `Jesteś zmęczony błaganiem! Spróbuj ponownie za **${timeMessage}**.`,
                    { remainingTime, minutes, seconds, cooldownType: 'beg' }
                );
            }

            const success = Math.random() < SUCCESS_CHANCE;

            let replyEmbed;
            let newCash = userData.wallet;

            if (success) {
                const amountWon =
                    Math.floor(Math.random() * (MAX_WIN - MIN_WIN + 1)) + MIN_WIN;

                newCash += amountWon;

                const successMessages = [
                    `Życzliwy nieznajomy zostawia **$${amountWon.toLocaleString()}** into your cup.`,
                    `Zauważyłeś niepilnowany portfel! Zdobywasz **$${amountWon.toLocaleString()}** and run.`,
                    `Ktoś się nad tobą zlitował i dał ci **$${amountWon.toLocaleString()}**!`,
                    `Znalazłeś **$${amountWon.toLocaleString()}** under a park bench.`,
                ];

                replyEmbed = successEmbed(
                    'Udane żebranie',
                    successMessages[
                        Math.floor(Math.random() * successMessages.length)
                    ]
                );
            } else {
                const failMessages = [
                    "Policja cię przegoniła. Zostałeś z niczym.",
                    "Ktoś krzyknął: „Znajdź sobie pracę!” i przeszedł obok.",
                    "Wiewiórka ukradła jedyną monetę, jaką miałeś.",
                    "Próbowałeś żebrać, ale zbyt się wstydziłeś i odpuściłeś.",
                ];

                replyEmbed = warningEmbed(
                    'Insufficient Funds',
                    failMessages[Math.floor(Math.random() * failMessages.length)]
                );
            }

            userData.wallet = newCash;
userData.lastBeg = Date.now();

            await setEconomyData(client, guildId, userId, userData);

            await InteractionHelper.safeEditReply(interaction, { embeds: [replyEmbed] });
    }, { command: 'beg' })
};
