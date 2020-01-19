const config = require("../../config.json");
import { log, api } from "../Util";
import EventEmitter from "events"
import { gw2 } from "gw2api-client"
import { BotgartClient } from "../BotgartClient"

enum WvWMapNames {
    Center = "Center",
    BlueHome = "BlueHome",
    GreenHome= "GreenHome",
    RedHome = "RedHome"
}

interface RGBNumbers {
    readonly red: number;
    readonly blue: number;
    readonly green: number
}

interface MapStats {
    readonly id: number;
    readonly type: WvWMapNames,
    readonly scores: any[],
    readonly bonues: string[],
    readonly objectives: any[],
    readonly deaths: any[],
    readonly kills: any[]
}

export interface WvWStats {
    readonly id: string;
    readonly deaths: RGBNumbers;
    readonly kills: RGBNumbers;
    readonly maps: { id: number, type: WvWMapNames, "deaths": any, kills: any }[];
}

export interface WvWMatches {
    readonly id: string;
    readonly start_time: string;
    readonly end_time: string;
    readonly scores: RGBNumbers;
    readonly worlds: RGBNumbers;
    readonly all_worlds: { red: number[], blue: number[], green: number[] };
    readonly deaths: RGBNumbers;
    readonly kills:  RGBNumbers;
    readonly victory_points: RGBNumbers;
    readonly skirmishes: {id: number, scores: any[], map_scores: any[]}[]
    readonly maps: MapStats[]
}

export class APIEmitter extends EventEmitter {
    public readonly name: string;
    public readonly interval: number;

    public constructor() {
        super();
        //this.schedule("wvw-objectives", api => api.wvw().objectives(), 60000);
        //this.schedule("wvw-upgrades", api => api.wvw().upgrades(), 1000);
        this.schedule("wvw-stats", api => api.wvw().matches().live().stats().world(config.home_id)
                                             .catch(err => console.log(`Error while fetching match stats: ${err}`))
                                 , config.gw2api.delays.wvw_stats)
        this.schedule("wvw-matches", api => api.wvw().matches().live().world(config.home_id)
                                               .catch(err => console.log(`Error while fetching match details: ${err}`))
                                   , config.gw2api.delays.wvw_matches);

    }

    public schedule(name: string, endpoint: (gw2) => any, interval: number): void {
        endpoint(api).then(r => console.log(name, r));
        setInterval(() => this.emit(name, endpoint(api)), interval);
    }
}