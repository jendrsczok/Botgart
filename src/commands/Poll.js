const { Command } = require("discord-akairo");
const winston = require('winston');
const DB = require.main.require("./src/DB.js");
const Util = require.main.require("./src/Util.js");
const Const = require.main.require("./src/Const.js");
const L = require.main.require("./src/Locale.js");
const config = require.main.require("./config.json");
const BotgartCommand = require.main.require("./src/BotgartCommand.js");

class PollCommand extends BotgartCommand {
    constructor() {
        super("poll", {
            aliases: ["poll","vote"],
            split: "quoted",
            args: [
                {
                    id: "channel",
                    type: "textChannel"
                },
                {
                    id: "question",
                    type: "string",
                },
                {
                    id: "emotes",
                    //type: "string"
                    type: es => es ? es.split(" ") : []
                }
            ]
        });
    }

    command(guild, args) {
        Util.assertType(args.channel, "TextChannel");
        Util.assertType(args.question, "String");
        Util.assertType(args.emotes, "Array");

        args.channel.send(args.question).then(m => {
            // filter empty strings out beforehand
            args.emotes.filter(react => react).forEach(react => {
                // works for standard emotes, like ":D" etc
                m.react(react).then(
                    _ => {},
                    _ => {
                        const reg = /<a?:[a-zA-Z0-9_]+:(\d+)>/;
                        const match = react.match(reg);
                        const customEmote = match ? args.channel.guild.emojis.find(e => e.id === match[1]) : undefined;
                        
                        // could still be garbage or from another server -> just ignore it in that case
                        if(customEmote) {
                            m.react(customEmote);
                        }
                    }
                );
            });
        },
        _ => {});
        winston.log("info", "Created poll '{0}'.".formatUnicorn(args.question));
    }

    checkArgs(args) {
        return !args || !args.channel || !args.question || !args.emotes || args.emotes.length < 1 ? message.util.send(L.get("HELPTEXT_POLL")) : undefined;
    }

    serialiseArgs(args) {
        let clone = Object.assign({}, args);
        clone.channel = {guild: args.channel.guild.id, channel: args.channel.id};
        return JSON.stringify(clone);
    }

    deserialiseArgs(jsonargs) {
        let args = JSON.parse(jsonargs);
        let guild = this.client.guilds.find(g => g.id === args.channel.guild);
        args.channel = guild.channels.find(c => c.id === args.channel.channel);
        return args;
    }
}

module.exports = PollCommand;