const { Command } = require("discord-akairo");
const winston = require('winston');
const L = require.main.require("./src/Locale.js");
const DB = require.main.require("./src/DB.js");
const config = require.main.require("./config.json");
const BotgartCommand = require.main.require("./src/BotgartCommand.js");

class DeleteCronCommand extends BotgartCommand {
    constructor() {
        super("deletecron", {
            aliases: ["deletecron","rmcron","delcron"],
            args: [
                {
                    id: "id",
                    type: "int",
                    default: ""
                }
            ],
            userPermissions: ["ADMINISTRATOR"]
        }, cronable = false);
    }

    checkArgs(args) {
        return !args || !args.id || !args.id < 0 ? message.util.send(L.get("HELPTEXT_DEL_CRON")) : undefined;
    }

    command(guild, args) {
        let cid = args.id;
        let deleted = this.deleteCronjob(cid);
        return deleted;
    }

    exec(message, args) {
        if(!message.member) {
            return message.util.send(L.get("NOT_AVAILABLE_AS_DM"));
        }

        let errorMessage = this.checkArgs(args);
        if(errorMessage) {
            return message.util.send(errorMessage);
        }
        
        let mes = this.command(message.guild, args);
        return message.util.send(mes);
    }

    /**
    * Deletes a scheduled cronjob from DB and/or schedule.
    * @param {int} id - ID of the cronjob to delete
    * @returns {boolean} - whether the cron was deleted from either DB or schedule.
    */
    deleteCronjob(id) {
        let canceled = false;
        let deletedFromDB = false;
        if(id in this.client.cronjobs) {
            this.client.cronjobs[id].cancel();
            delete this.client.cronjobs[id];
            canceled = true;
            winston.log("info", "Canceled cronjob with ID {0}.".formatUnicorn(id));
        }
        if(DB.deleteCronjob(id)) {
            deletedFromDB = true;
            winston.log("info", "Deleted cronjob with ID {0} from DB.".formatUnicorn(id));
        }
        return canceled || deletedFromDB;
    }
}

module.exports = DeleteCronCommand;