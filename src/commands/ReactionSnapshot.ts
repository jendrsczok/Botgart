import * as discord from "discord.js";
import { BotgartCommand } from "../BotgartCommand";
import { BotgartClient } from "../BotgartClient";

/**
Testcases:

*/
export class ReactionSnapshot extends BotgartCommand {
    constructor() {
        super("reactionsnapshot", {
            aliases: ["reactionsnapshot"],
            quoted: true,
            args: [
                {
                    id: "message",
                    type: async (message: discord.Message, phrase: string) => { 
                        const match = phrase.match(/^https:\/\/discordapp.com\/channels\/(\d+)\/(\d+)\/(\d+)$/)
                        if(match !== null) {
                            const [_, guildId, channelId, messageId] = match;
                            const cl: BotgartClient = this.getBotgartClient();

                            const guild: discord.Guild | undefined = cl.guilds.cache.find(g => g.id === guildId);
                            if(guild !== undefined) {
                                const channel: discord.TextChannel | undefined = <discord.TextChannel>guild.channels.cache.find(c => c instanceof discord.TextChannel && c.id === channelId);
                                if(channel !== undefined) {
                                    return await channel.messages.fetch(messageId).catch(er => null);
                                }
                            }
                        }
                        return null; // yes, I hate this style, but the alternative to have nullable result type that is not-null at some points was equally bad.
                    }
                }
            ],
            userPermissions: ["ADMINISTRATOR"]
        },
        {
            cronable: true
        }
        );
    }

    async command(message: discord.Message, responsible: discord.User, guild: discord.Guild, args: any): Promise<void> {
        const listings: string[] = [];
        for(const [k, reaction] of (<discord.Message>args.message).reactions.cache.sort((r1,r2) => (r2.count ?? 0) - (r1.count ?? 0))) {
            const users = await reaction.users.fetch();
            listings.push(`**${reaction.emoji.name} (${reaction.count})**\n${users.map(u => `${u.username} (<@${u.id}>) `).join("\n")}`)
        }
        message.reply("\n" + listings.join("\n\n"), {split: true});
    }
}

module.exports = ReactionSnapshot;