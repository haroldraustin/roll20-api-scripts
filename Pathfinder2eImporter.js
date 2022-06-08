/* Developer: Harold Austin

Provides players and gms the tools to build character sheets, assign imported characters, and takes the Pathbuilder2 
app exported character sheet and fills inthe available data (this is a straight data mapping)

Todo: 
1) Monster stat import for GM and players (as pets)

2) Hero Lab import

3) Foundry Export

4) token cleanup/configuration

  
*/

var Pathfinder2eImporter = Pathfinder2eImporter || {};

// auto load hand out with instructions
on("ready", function () {
    // Insert Text Box into PF2e character sheet
    'use strict';
    Pathfinder2eImporter.CreateHandOutInstructions();
});

on("chat:message", function (msg) {
    if (msg.type == "api" && msg.content.indexOf("!importPF2") == 0) {
        Pathfinder2eImporter.importPathFinder2JSON(msg);
    }

    if (msg.type == "api" && msg.content.indexOf("!assignChar") == 0) {
        Pathfinder2eImporter.assignCharacter(msg);
    }

    if (msg.type == "api" && msg.content.indexOf("!charsheet") == 0) {
        Pathfinder2eImporter.generateCharacterSheet(msg);
    }

    if (msg.type == "api" && msg.content.indexOf("!buildNPC") == 0) {
        Pathfinder2eImporter.importNPCStatBlock(msg);
    }

    if (msg.type == "api" && msg.content.indexOf("!rollInit") == 0) {
        Pathfinder2eImporter.rollInit(msg);
    }

    if (msg.type == "api" && msg.content.indexOf("!resetInit") == 0) {
        let turnorder = []
        Campaign().set("turnorder", JSON.stringify(turnorder));
        sendChat('Pathfinder2e', '/w GM Turn Order should be cleared out');
    }

    if (msg.type == "api" && msg.content.indexOf("!defaultNPCSheet") == 0) {
        Pathfinder2eImporter.defaultNPCSheet(msg);
    }

});

Pathfinder2eImporter.defaultNPCSheet = function () {
    "use strict";

    let CharacterArray = Pathfinder2eImporter.getNPCCharacters();
    _.each(CharacterArray, (npcSheet) => {
        Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "player_name", "GM");
        Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "whispertype", "0");
        Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "roll_show_notes", "[[1]]");
        Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "roll_limit_height", "limit-height");
        //Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "roll_option_critical_damage", "none");
    });
};


Pathfinder2eImporter.getCharacters = function (id) {
    "use strict";

    let CharacterArray = findObjs({
        _type: 'character',
        controlledby: id
    });
    return CharacterArray;
};

Pathfinder2eImporter.getNPCCharacters = function () {
    "use strict";

    let CharacterArray = findObjs({
        _type: 'character',
        controlledby: ''
    });

    return CharacterArray;
};

Pathfinder2eImporter.doesValueAlreadyExist = function (charId, value) {
    "use strict";
    let bReturn = false;

    let CharAttributes = findObjs({
        _type: 'attribute',
        _id: charId,
    });

    _.each(CharAttributes, (ca) => {
        if (ca.get('current') == value) {
            return ca.get('id');
        }
    });

    return false;
};

"use strict";
Pathfinder2eImporter.replaceCharacterAttribute = function (id, attrname, value, maxValue = '') {

    let CharAttribute;

    if (attrname.startsWith("repeating_") == false) {
        CharAttribute = findObjs({
            type: 'attribute',
            characterid: id,
            name: attrname
        })[0];
    }
    else {
        let attrname_root = attrname.slice(0, 10);
        CharAttributeArray = findObjs({
            type: 'attribute',
            characterid: id,
            current: value
        });

        _.each(CharAttributeArray, (char) => {
            if (char.id.startsWith(attrname_root)) {
                CharAttribute = char;
            }
        });
    }

    if (CharAttribute === undefined && value != undefined) {
        let tempObject = createObj('attribute', {
            characterid: id,
            name: attrname,
            current: value,
            max: maxValue,
        });
    }
    else if (value == undefined) {
        log("replaceCharacterAttribute " + attrname + " value submitted is undefined");
    }
    else {
        CharAttribute.set('current', value);
    }
};

"use strict";
Pathfinder2eImporter.updateCharacterAttribute = function (id, attrname, value, maxValue = '') {

    let CharAttribute = findObjs({
        type: 'attribute',
        characterid: id,
        name: attrname,
    })[0];

    if (CharAttribute == null) {
        CharAttribute = createObj('attribute', {
            characterid: id,
            name: attrname,
        });
    }

    let attrValue = getAttrByName(id, attrname);

    if (attrValue == null) {
        attrValue = value;
    }
    else if (attrname == "toggles" && attrValue.includes(value) == false) {
        attrValue += "," + value;
    }
    else if (attrValue.includes(value) == false && attrValue.length > 0) {
        attrValue += ", " + value;
    }
    else if (attrValue.includes(value) == false) {
        attrValue = value;
    }

    CharAttribute.set('current', attrValue);

};

Pathfinder2eImporter.isJsonString = function (str) {
    'use strict';
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

Pathfinder2eImporter.parseJsonString = function (str) {
    'use strict';
    try {
        return JSON.parse(str);
    } catch (e) {

    }
    return false;
}

Pathfinder2eImporter.returnAbility = function (str) {
    "use strict";
    if (str == "str") {
        return 'strength';
    }
    else if (str == "dex") {
        return 'dexterity';
    }
    else if (str == "con") {
        return 'constitution';
    }
    else if (str == "int") {
        return 'intelligence';
    }
    else if (str == "wis") {
        return 'wisdom';
    }
    else if (str == "cha") {
        return 'charisma';
    }
};

Pathfinder2eImporter.generateCharacterSheet = function (msg) {
    let generatorversion = "1.2.1";
    let playerid = msg.playerid;
    let player = msg.who;

    let template = {
        "gmnotes": "Player: " + player +
            "<br>Generated By: CharacterSheet " + generatorversion,
        "charactername": msg.who + " #" +
            (findObjs({ _type: "character", controlledby: playerid }).length + 1)
    }
    template.channelalert = "created a character named \"" +
        template.charactername + "\"!";

    let viewableBy = "all";
    let controlledby = playerid;

    let character = createObj("character", {
        name: template.charactername,
        archived: false,
        inplayerjournals: viewableBy,
        controlledby: controlledby
    });
    character.set("gmnotes", template.gmnotes);
    createObj("attribute", {
        name: "player_name",
        current: player,
        _characterid: character.id
    });
    /* Set Character's name */
    createObj("attribute", {
        name: "name",
        current: template.charactername,
        _characterid: character.id
    });
    /* Set script version, used for debugging */
    createObj("attribute", {
        name: "sheet_generator",
        current: "CharacterSheet v" + generatorversion,
        _characterid: character.id
    });

    sendChat(player, "/me " + template.channelalert);
};

Pathfinder2eImporter.assignCharacter = function (msg) {
    let playerid = msg.playerid;
    let player = msg.who;

    let args = msg.content.split(/\s+/);

    if (args.length > 1) {
        let CharObj = getObj("character", args[1]);

        CharObj.set("controlledby", playerid);
        CharObj.set("inplayerjournals", "all");
        if (playerIsGM(playerid) == true) {
            Pathfinder2eImporter.replaceCharacterAttribute(args[1], "player_name", "GM");
        }
        else {
            Pathfinder2eImporter.replaceCharacterAttribute(args[1], "player_name", player);
        }
        sendChat(`character|${args[1]}`, "I'm yours! Now, get me money to buy gear ... something nice.");
    }
    else {
        let CharacterArray = findObjs({ _type: 'character', controlledby: '', });; // get characters without assignment
        _.each(CharacterArray, (char) => {

            if (getAttrByName(char.id, "player_name") != null) {
                if (getAttrByName(char.id, "player_name") == "") {
                    sendChat(`character|${char.id}`, `<a href="!assignChar ${char.id}" >${getAttrByName(char.id, "character_name")}</a>`);
                }
            }
        });
    }
};

Pathfinder2eImporter.importPathFinder2JSON = function (msg) {

    let playerid = msg.playerid;
    let player = msg.who;
    let CharacterArray = Pathfinder2eImporter.getCharacters(msg.playerid);

    sendChat("PathBuilder", `/w ${player} Starting Character import for you ...`);
    _.each(CharacterArray, (o) => {
        let Attributecounter = 1000;
        Attributecounter += 1;
        // need to add logic to not look at companions, familiars and whatnot
        if (o.get("name").length > 0) { // do not look in the pets for JSON code
            Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'player_name', player);
            if (getAttrByName(o.get('id'), 'sheet_type') != "npc") {
                if (Pathfinder2eImporter.isJsonString(getAttrByName(o.get('id'), "campaign_notes")) === true) {
                    let CharJson = Pathfinder2eImporter.parseJsonString(getAttrByName(o.get('id'), "campaign_notes"));
                    if (CharJson['success'] == true && CharJson['build'] != undefined) {

                        o.set("name", CharJson.build['name']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'class', CharJson.build['class']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'level', CharJson.build['level']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'ancestry_heritage', CharJson.build['ancestry']);

                        let ancHeritage = getAttrByName(o.get('id'), 'ancestry_heritage') + " (" + CharJson.build['heritage'] + ")";
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'ancestry_heritage', ancHeritage);

                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'background', CharJson.build['background']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'alignment', CharJson.build['alignment']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'gender_pronouns', CharJson.build['gender']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'age', CharJson.build['age'], Attributecounter);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'deity', CharJson.build['deity']);

                        // set size ...
                        if (CharJson.build['size'] == 1) {
                            Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'size', 'Small');
                        }
                        else if (CharJson.build['size'] == 2) {
                            Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'size', 'Medium');
                        }
                        else if (CharJson.build['size'] == 0) {
                            Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'size', 'Tiny');
                        }
                        else if (CharJson.build['size'] == 3) {
                            Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'size', 'Large');
                        }
                        else if (CharJson.build['size'] == 4) {
                            Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'size', 'Huge', Attributecounter);
                        }
                        else if (CharJson.build['size'] == 5) {
                            Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'size', 'Gargantuan');
                        }

                        if (CharJson.build['languages'] != undefined) {
                            _.each(CharJson.build['languages'], (oLang) => {
                                // if value already exists do not add to character sheet (how to prevent collisions?)
                                if (Pathfinder2eImporter.doesValueAlreadyExist(o.get('id'), oLang) === false) {
                                    Attributecounter += 1;
                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `repeating_languages_${o.get('id')}${Attributecounter}_toggles`, 'display,settings,');
                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `repeating_languages_${o.get('id')}${Attributecounter}_language`, oLang);
                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `repeating_languages_${o.get('id')}${Attributecounter}_language_notes`, oLang);
                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `repeating_languages_${o.get("id")}${Attributecounter}_settings`, '0');
                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `repeating_languages_${o.get("id")}${Attributecounter}_display`, 'hidden');
                                }
                            });

                        }

                        // attributes
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'speed', CharJson.build.attributes['speed']);

                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'hit_points_ancestry', CharJson.build.attributes['ancestryhp']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'hit_points_class', CharJson.build.attributes['classhp']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'hit_points_notes', CharJson.build.attributes['bonushp']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'hit_points_other', CharJson.build.attributes['bonushpPerLevel']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'hit_points', getAttrByName(o.get('id'), 'hit_points_max'));

                        // abilities
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'strength_score', CharJson.build.abilities['str']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'strength', CharJson.build.abilities['str']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'strength_modifier', Pathfinder2eImporter.returnModifier(CharJson.build.abilities['str']));
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'dexterity_score', CharJson.build.abilities['dex']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'dexterity', CharJson.build.abilities['dex']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'dexterity_modifier', Pathfinder2eImporter.returnModifier(CharJson.build.abilities['dex']));
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'constitution_score', CharJson.build.abilities['con']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'constitution', CharJson.build.abilities['con']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'constitution_modifier', Pathfinder2eImporter.returnModifier(CharJson.build.abilities['con']));
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'intelligence_score', CharJson.build.abilities['int']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'intelligence', CharJson.build.abilities['int']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'intelligence_modifier', Pathfinder2eImporter.returnModifier(CharJson.build.abilities['int']));
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'wisdom_score', CharJson.build.abilities['wis']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'wisdom', CharJson.build.abilities['wis']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'wisdom_modifier', Pathfinder2eImporter.returnModifier(CharJson.build.abilities['wis']));
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'charisma_score', CharJson.build.abilities['cha']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'charisma', CharJson.build.abilities['cha']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'charisma_modifier', Pathfinder2eImporter.returnModifier(CharJson.build.abilities['cha']));

                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'class_dc_rank', CharJson.build.proficiencies['classDC']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'perception_rank', CharJson.build.proficiencies['perception']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'saving_throws_fortitude_rank', CharJson.build.proficiencies['fortitude']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'saving_throws_reflex_rank', CharJson.build.proficiencies['reflex']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'saving_throws_will_rank', CharJson.build.proficiencies['will']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'armor_class_heavy_rank', CharJson.build.proficiencies['heavy']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'armor_class_medium_rank', CharJson.build.proficiencies['medium']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'armor_class_light_rank', CharJson.build.proficiencies['light']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'armor_class_unarmored_rank', CharJson.build.proficiencies['unarmored']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'weapon_proficiencies_martial_rank', CharJson.build.proficiencies['martial']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'weapon_proficiencies_simple_rank', CharJson.build.proficiencies['simple']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'magic_tradition_arcane_rank', CharJson.build.proficiencies['castingArcane']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'magic_tradition_divine_rank', CharJson.build.proficiencies['castingDivine']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'magic_tradition_occult_rank', CharJson.build.proficiencies['castingOccult']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'magic_tradition_primal_rank', CharJson.build.proficiencies['castingPrimal']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'arcana_rank', CharJson.build.proficiencies['arcana']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'athletics_rank', CharJson.build.proficiencies['athletics']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'crafting_rank', CharJson.build.proficiencies['crafting']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'deception_rank', CharJson.build.proficiencies['deception']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'diplomacy_rank', CharJson.build.proficiencies['diplomacy']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'intimidation_rank', CharJson.build.proficiencies['intimidation']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'medicine_rank', CharJson.build.proficiencies['medicine']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'nature_rank', CharJson.build.proficiencies['nature']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'occultism_rank', CharJson.build.proficiencies['occultism']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'performance_rank', CharJson.build.proficiencies['performance']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'religion_rank', CharJson.build.proficiencies['religion']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'society_rank', CharJson.build.proficiencies['society']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'stealth_rank', CharJson.build.proficiencies['stealth']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'survival_rank', CharJson.build.proficiencies['survival']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'thievery_rank', CharJson.build.proficiencies['thievery']);

                        // str, decx con, int, wis, cha - for the class_dc_key_ability_select - driven by the modifier
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'class_dc_key_ability_select', `${Pathfinder2eImporter.returnModifier(CharJson.build.abilities[CharJson.build.keyability])}`);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'class_dc_key_select', `${Pathfinder2eImporter.returnModifier(CharJson.build.abilities[CharJson.build.keyability])}`);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'class_dc_key_ability', `${Pathfinder2eImporter.returnModifier(CharJson.build.abilities[CharJson.build.keyability])}`);


                        // set dynamic proficency fields
                        // repeating_weapon-proficiencies
                        Attributecounter += 1;
                        let repeatingRow = "repeating_weapon-proficiencies_";
                        let endingString = "_weapon_proficiencies_other";
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get('id')}${Attributecounter}_toggles`, 'display,settings,');
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_settings`, '0');
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_display`, '0');
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get('id')}${Attributecounter}${endingString}`, "unarmed");
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get('id')}${Attributecounter}${endingString}_rank`, CharJson.build.proficiencies['unarmed']);

                        Attributecounter += 1;
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get('id')}${Attributecounter}_toggles`, 'display,settings,');
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_settings`, '0');
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_display`, '0');
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get('id')}${Attributecounter}${endingString}`, "advanced");
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get('id')}${Attributecounter}${endingString}_rank`, CharJson.build.proficiencies['advanced']);

                        let IgnoreHeritageFeatInSpecial = "";

                        if (CharJson.build['feats'] != null) {
                            _.each(CharJson.build['feats'], (obj) => {
                                Attributecounter += 1;
                                let repeatingRow = "repeating_feat-class_"; // default based on pathbulder output
                                let endingString = "_feat_class";

                                switch (obj.length) {
                                    case 4: // Commbine with 3 - it identifie wthe repating-row
                                    case 3: // test the length is 4 before adding attribute
                                        // need to determine which repeating row to use ....
                                        // "repeating_feat-ancestry","repeating_feat-class","repeating_feat-general","repeating_feat-bonus", "repeating_feat-skill"
                                        if (obj[2] == "Heritage") {
                                            IgnoreHeritageFeatInSpecial = obj[0];
                                            repeatingRow = "repeating_feat-ancestry_";
                                            endingString = "_feat_ancestry";
                                        }
                                        if (obj[2] == "Ancestry Feat") {
                                            repeatingRow = "repeating_feat-ancestry_";
                                            endingString = "_feat_ancestry";
                                        }
                                        if (obj[2] == "Class Feat") {
                                            repeatingRow = "repeating_feat-class_";
                                            endingString = "_feat_class";
                                        }
                                        if (obj[2] == "Skill Feat") {
                                            repeatingRow = "repeating_feat-skill_";
                                            endingString = "_feat_skill";
                                        }
                                        if (obj[2] == "General Feat") {
                                            repeatingRow = "repeating_feat-general_";
                                            endingString = "_feat_general";
                                        }
                                        if (obj.length == 4) {
                                            Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get('id')}${Attributecounter}${endingString}_level`, obj[3]);
                                        }
                                    case 2: // null? - no idea what this susppose to be
                                    case 1:
                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get('id')}${Attributecounter}_toggles`, 'display,settings,');
                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_settings`, '0');
                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_display`, '0');
                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get('id')}${Attributecounter}${endingString}`, obj[0]);

                                        break;
                                    default:
                                        break;
                                }
                            });
                        }

                        //special - don't know how to handle this
                        if (CharJson.build['specials'] != null) {
                            _.each(CharJson.build['specials'], (obj) => {
                                Attributecounter += 1;
                                if (obj == IgnoreHeritageFeatInSpecial) // not that special
                                { // Do nothing this is a heritage feat

                                }
                                else if (obj == "Low-Light Vision" || obj == "Darkvision") // add to perception notes
                                { // add to perception notes
                                    let repeatingRow = "repeating_senses_";
                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'perception_notes', obj);
                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get('id')}${Attributecounter}_toggles`, 'display,settings,');
                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_settings`, '0');
                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_display`, '0');
                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get('id')}${Attributecounter}_sense`, obj);
                                }
                                else { // default - add to class abilities
                                    let repeatingRow = "repeating_feat-class_";
                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get('id')}${Attributecounter}_toggles`, 'display,settings,');
                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_settings`, '0');
                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_display`, '0');
                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get('id')}${Attributecounter}_feat_class`, obj);

                                    // adding special handling for the alchemist stuff
                                    if (obj == "Quick Alchemy") {
                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'quick_alchemy', 'on');
                                    }
                                    else if (obj == "Advanced Alchemy") {
                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'advanced_alchemy', 'on');
                                    }
                                    else if (obj == "Chirurgeon") { // research_field = 
                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `research_field`, 'chirurgeon');
                                    }
                                    else if (obj == "Bomber") {
                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `research_field`, 'bomber');
                                    }
                                    else if (obj == "Mutagenist") {
                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `research_field`, 'mutagenist');
                                    }
                                    else if (obj == "Toxicologist") {
                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `research_field`, 'toxicologist');
                                    }
                                }
                            });
                        }

                        //Lores [name, proficiency]
                        if (CharJson.build['lores'] != undefined) {
                            _.each(CharJson.build['lores'], (obj) => {
                                Attributecounter += 1;
                                switch (obj.length) {
                                    case 2: // repeating_lore lore_rank
                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `repeating_lore_${o.get('id')}${Attributecounter}_lore_rank`, obj[1]);
                                    case 1: // lore_proficiency_display // lore_name
                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `repeating_lore_${o.get('id')}${Attributecounter}_toggles`, 'display,settings,');
                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `repeating_lore_${o.get("id")}${Attributecounter}_settings`, '0');
                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `repeating_lore_${o.get("id")}${Attributecounter}_display`, '0');
                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `repeating_lore_${o.get('id')}${Attributecounter}_lore_name`, obj[0]);
                                        break;
                                    default:
                                        break;
                                }
                            });

                        }

                        // Equipment
                        if (CharJson.build['equipment'] != undefined) {
                            // "repeating_items-worn", "repeating_items-readied", "repeating_items-other",

                            _.each(CharJson.build['equipment'], (obj) => {
                                let repeatingRow = "repeating_items-other_"; // default based on pathbulder output
                                Attributecounter += 1;
                                switch (obj.length) {
                                    case 2:
                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get('id')}${Attributecounter}_other_quantity`, obj[1]);
                                    case 1:
                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get('id')}${Attributecounter}_toggles`, 'display,settings,');
                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_settings`, '0');
                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_display`, '0');
                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get('id')}${Attributecounter}_other_item`, obj[0]);
                                        break;
                                    default:
                                        break;
                                }
                            });
                        }

                        // specificProficiencies ? No idea what to do with this ...
                        if (CharJson.build['specificProficiencies'] != undefined) {

                        }

                        // weapons
                        if (CharJson.build['weapons'] != undefined) {
                            // "repeating_melee-strikes", repeating_ranged-strikes
                            _.each(CharJson.build['weapons'], (obj) => {
                                let repeatingRow = "repeating_melee-strikes_"; // default based on pathbulder output
                                let repeatingRow2 = "repeating_ranged-strikes_";
                                let repeatingEquipRow = "repeating_items-readied_";
                                Attributecounter += 1;
                                if (obj['name']) {
                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow2}${o.get('id')}${Attributecounter}_toggles`, 'display,settings,');
                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow2}${o.get("id")}${Attributecounter}_settings`, '0');
                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow2}${o.get("id")}${Attributecounter}_display`, '0');
                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow2}${o.get('id')}${Attributecounter}_weapon`, obj['name']);
                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow2}${o.get('id')}${Attributecounter}_weapon_ability`, ((CharJson.build.abilities['dex'] - 10) / 2));
                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get('id')}${Attributecounter}_toggles`, 'display,settings,');
                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_settings`, '0');
                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_display`, '0');
                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get('id')}${Attributecounter}_weapon`, obj['name']);
                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get('id')}${Attributecounter}_weapon_ability`, ((CharJson.build.abilities['str'] - 10) / 2));
                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get('id')}${Attributecounter}_damage_ability`, ((CharJson.build.abilities['str'] - 10) / 2));
                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingEquipRow}${o.get('id')}${Attributecounter}_toggles`, 'display,settings,');
                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingEquipRow}${o.get("id")}${Attributecounter}_settings`, '0');
                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingEquipRow}${o.get("id")}${Attributecounter}_display`, '0');
                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingEquipRow}${o.get('id')}${Attributecounter}_readied_item`, obj['name']);
                                }
                                if (obj['qty']) {
                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingEquipRow}${o.get('id')}${Attributecounter}_worn_quantity`, obj['qty']);
                                }
                                if (obj['prof']) {
                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get('id')}${Attributecounter}_weapon_rank`, CharJson.build.proficiencies[`${obj['prof']}`]);
                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow2}${o.get('id')}${Attributecounter}_weapon_rank`, CharJson.build.proficiencies[`${obj['prof']}`]);
                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get('id')}${Attributecounter}_weapon_category`, obj['prof']);
                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow2}${o.get('id')}${Attributecounter}_weapon_category`, obj['prof']);
                                }
                                if (obj['die']) {
                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow2}${o.get('id')}${Attributecounter}_damage_dice`, 1);
                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get('id')}${Attributecounter}_damage_dice`, 1);
                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow2}${o.get('id')}${Attributecounter}_damage_dice_size`, obj['die'].toUpperCase());
                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get('id')}${Attributecounter}_damage_dice_size`, obj['die'].toUpperCase());
                                }
                                if (obj['pot']) {
                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get('id')}${Attributecounter}_weapon_item`, obj['pot']);
                                }
                                if (obj['display name']) {
                                    // Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'),`${repeqtinqEquipRow}${o.get('id')}${Attributecounter}_worn_quantity`, obj['qty']);
                                }
                                if (obj['runes']) {
                                    // Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'),`${repeqtinqEquipRow}${o.get('id')}${Attributecounter}_worn_quantity`, obj['qty']);
                                }
                            });
                        }

                        // money
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'pp', CharJson.build.money['pp']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'gp', CharJson.build.money['gp']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'sp', CharJson.build.money['sp']);
                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'cp', CharJson.build.money['cp']);

                        // armor
                        if (CharJson.build['armor'] != undefined) {
                            // "repeating_items-worn", "repeating_items-readied", "repeating_items-other",

                            _.each(CharJson.build['armor'], (obj) => {

                                let repeatingEquipRow = "repeating_items-other_";
                                let reapeatingEnd = "_other";
                                if (obj['worn'] == true) {
                                    repeatingEquipRow = "repeating_items-worn_";
                                    reapeatingEnd = "_worn";
                                }

                                Attributecounter += 1;
                                if (obj['name'] != undefined) {
                                    let armorOutput = obj['name'];

                                    if (obj['runes'] != undefined) {

                                    }

                                    if (obj['pot'] > 0) {
                                        armorOutput + ` +${obj['pot']}`;
                                    }
                                    if (obj['res'].length > 1) {
                                        armorOutput = obj['res'] + " " + armorOutput;
                                    }
                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingEquipRow}${o.get('id')}${Attributecounter}_toggles`, 'display,settings,');
                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingEquipRow}${o.get("id")}${Attributecounter}_settings`, '0');
                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingEquipRow}${o.get("id")}${Attributecounter}_display`, '0');
                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingEquipRow}${o.get('id')}${Attributecounter}${reapeatingEnd}_item`, armorOutput);
                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), "armor_class_armor_name", armorOutput);
                                }
                                if (obj['qty'] != undefined) // worn_quantity
                                {
                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingEquipRow}${o.get('id')}${Attributecounter}${reapeatingEnd}_quantity`, obj['qty']);
                                }
                                if (obj['prof'] != undefined) {

                                }
                                if (obj['display'] != undefined) {

                                }
                            });
                        }

                        // spellCasters
                        if (CharJson.build['spellCasters'] != undefined) {
                            _.each(CharJson.build['spellCasters'], (obj) => {
                                if (obj["name"] != undefined) { // Nothing to do about with this

                                }
                                if (getAttrByName(o.get('id'), 'spell_attack_rank') == null) {
                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'spell_attack_rank', obj['proficiency']);
                                }
                                if (getAttrByName(o.get('id'), 'spell_dc_rank') == null) {
                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), 'spell_dc_rank', obj['proficiency']);
                                }

                                // Set repeating value here
                                if (obj["spellcastingType"] != undefined && obj["ability"] != undefined && obj["magicTradition"] != undefined) {
                                    let repeatingRow = "";
                                    // set repeating row name
                                    if (obj["spellcastingType"] == "prepared" && obj["ability"] == "cha") {
                                        repeatingRow = "repeating_spellinnate_";
                                        if (obj["spells"] != undefined) // if there are no spell names - there is no field to add ...
                                        {
                                            _.each(obj["spells"], (spells) => {
                                                Attributecounter += 1;
                                                if (spells["list"] != undefined) {
                                                    _.each(spells["list"], (name) => { // running out of names hare ...
                                                        // Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_current_level`, spellDtl['spellLevel']);
                                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get('id')}${Attributecounter}_toggles`, 'display,settings,');
                                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_settings`, '0');
                                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_display`, '0');
                                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_name`, name);
                                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_spelllevel`, CharJson.build['level']);
                                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_spellattack_rank`, obj['proficiency']);
                                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_spelldc_rank`, obj['proficiency']);
                                                        if (obj["magicTradition"] != undefined) {
                                                            Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_magic_tradition`, obj["magicTradition"]);
                                                        }
                                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_spellattack_ability`, obj["ability"]);
                                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_spellattack_ability`, obj["ability"]);
                                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_damage_ability`, obj["ability"]);
                                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_spelldc_ability`, obj["ability"]);
                                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_frequency`, "at-will");
                                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_current_level`, CharJson.build['level']);
                                                    });
                                                }
                                            });
                                        }
                                    }
                                    else if (obj["magicTradition"] == "focus") {
                                        repeatingRow = "repeating_spellfocus_";
                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `focus_points`, obj["focusPoints"]);
                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `focus_points_max`, obj["focusPoints"]);
                                        if (obj["spells"] != undefined) // if there are no spell names - there is no field to add ...
                                        {
                                            _.each(obj["spells"], (spells) => {
                                                if (spells["list"] != undefined) {
                                                    _.each(spells["list"], (name) => { // running out of names hare ...
                                                        Attributecounter += 1;
                                                        // Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_current_level`, spellDtl['spellLevel']);
                                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get('id')}${Attributecounter}_toggles`, 'display,settings,');
                                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_settings`, '0');
                                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_display`, '0');
                                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_name`, name);
                                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_spelllevel`, CharJson.build['level']);
                                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_spellattack_rank`, obj['proficiency']);
                                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_spelldc_rank`, obj['proficiency']);
                                                        if (obj["magicTradition"] != undefined) {
                                                            Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_magic_tradition`, obj["magicTradition"]);
                                                        }
                                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_spellattack_ability`, obj["ability"]);
                                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_damage_ability`, obj["ability"]);
                                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_spelldc_ability`, obj["ability"]);
                                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_spellattack_ability`, obj["ability"]);
                                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_frequency`, "daily-limit");
                                                    });
                                                }
                                            });
                                        }
                                    }
                                    else { // repeating_normalspells

                                        if (obj["spells"] != undefined) // if there are no spell names - there is no field to add ...
                                        {
                                            if (obj["spellcastingType"] != null) {
                                                if (obj["spellcastingType"] == "prepared") {
                                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `spellcaster_prepared`, "checked");
                                                }
                                                else if (obj["spellcastingType"] == "spontaneous") {
                                                    Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `spellcaster_spontaneous`, "checked");
                                                }
                                            }
                                            if (obj["perDay"] != null) {
                                                for (let i = 0; i < obj["perDay"].length; i++) {
                                                    if (obj.perDay[i] != 0) { // something other than 0 is in the array
                                                        if (i == 0) // this is a cantrip
                                                        {
                                                            Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `cantrips_per_day`, obj["perDay"][i]);
                                                        }
                                                        else {
                                                            Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `Level_${i}_per_day`, obj["perDay"][i]);
                                                            Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `level_${i}_per_day_max`, obj["perDay"][i]);
                                                        }
                                                    }
                                                }
                                            }
                                            _.each(obj["spells"], (spells) => {
                                                let currentLvl = 0;
                                                if (spells["spellLevel"] == 0) {
                                                    // cantrips_per_day
                                                    repeatingRow = "repeating_cantrip_";
                                                    currentLvl = CharJson.build['level'];
                                                }
                                                else {
                                                    repeatingRow = "repeating_normalspells_";
                                                    currentLvl = spells["spellLevel"];
                                                }
                                                if (spells["list"] != undefined) {
                                                    _.each(spells["list"], (name) => { // running out of names hare ...
                                                        Attributecounter += 1;
                                                        // Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_current_level`, spellDtl['spellLevel']);
                                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get('id')}${Attributecounter}_toggles`, 'display,settings,');
                                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_settings`, '0');
                                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_display`, '0');
                                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_name`, name);
                                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_spelllevel`, CharJson.build['level']);
                                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_spellattack_rank`, obj['proficiency']);
                                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_spelldc_rank`, obj['proficiency']);
                                                        if (obj["magicTradition"] != undefined) {
                                                            Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_magic_tradition`, obj["magicTradition"]);
                                                        }
                                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_spellattack_ability`, obj["ability"]);
                                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_damage_ability`, obj["ability"]);
                                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_spelldc_ability`, obj["ability"]);
                                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_frequency`, "daily-limit");
                                                        Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_current_level`, currentLvl);
                                                    });
                                                }
                                            });
                                        }
                                    }
                                }
                            });
                        }

                        // formula
                        if (CharJson.build['formula'] != undefined) {
                            // currently bomb proficiences are not tracked in pathbuilder 01/04/2022
                            Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `bomb_attack_rank`, CharJson.build.proficiencies['simple']);
                            _.each(CharJson.build['formula'], (books) => {
                                if (books['type'] != undefined) {
                                    if (books['type'] == "Alchemist") {
                                        _.each(books['known'], (recipe) => {
                                            Attributecounter += 1;
                                            if (recipe.includes("Elixir") || recipe.includes("Mutagen")) {
                                                repeatingRow = "repeating_elixirs_";
                                                Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get('id')}${Attributecounter}_toggles`, 'display,settings,');
                                                Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_settings`, '0');
                                                Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_display`, 'checked');
                                                Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_name`, recipe);
                                            }
                                            else if (recipe.includes("Flask") || recipe.includes("Bomb")) {
                                                repeatingRow = "repeating_bombs_";
                                                Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get('id')}${Attributecounter}_toggles`, 'display,settings,');
                                                Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_settings`, '0');
                                                Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_display`, 'checked');
                                                Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_name`, recipe);
                                            }
                                            else if (recipe.includes("Poison") || recipe.includes("Venom")) {
                                                repeatingRow = "repeating_poisons_";
                                                Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get('id')}${Attributecounter}_toggles`, 'display,settings,');
                                                Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_settings`, '0');
                                                Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_display`, 'checked');
                                                Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_name`, recipe);
                                            }
                                            else // put the recipe everywhere and let the player purge them out where they don't need ot be
                                            {
                                                repeatingRow = "repeating_elixirs_";
                                                Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get('id')}${Attributecounter}_toggles`, 'display,settings,');
                                                Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_settings`, '0');
                                                Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_display`, 'checked');
                                                Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_name`, recipe);

                                                repeatingRow = "repeating_bombs_";
                                                Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get('id')}${Attributecounter}_toggles`, 'display,settings,');
                                                Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_settings`, '0');
                                                Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_display`, 'checked');
                                                Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_name`, recipe);

                                                repeatingRow = "repeating_poisons_";
                                                Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get('id')}${Attributecounter}_toggles`, 'display,settings,');
                                                Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_settings`, '0');
                                                Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_display`, 'checked');
                                                Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), `${repeatingRow}${o.get("id")}${Attributecounter}_name`, recipe);
                                            }
                                        });
                                    }
                                }
                            });
                        }

                        // pets
                        if (CharJson.build['pets'] != undefined) {   // create a character sheet for the pet and populate it
                            _.each(CharJson.build['pets'], (pet) => {
                                // does pet already exist for the player?

                                let findPet = findObjs({
                                    type: 'character',
                                    controlledby: playerid,
                                    name: pet["name"]
                                })[0];

                                if (findPet == null) {
                                    let companionCharSheet = createObj("character", {
                                        name: pet["name"],
                                        archived: false,
                                        inplayerjournals: "all",
                                        controlledby: playerid
                                    });
                                    Pathfinder2eImporter.replaceCharacterAttribute(companionCharSheet.get('id'), 'player_name', player);
                                    Pathfinder2eImporter.replaceCharacterAttribute(companionCharSheet.get('id'), 'sheet_type', 'npc');
                                    Pathfinder2eImporter.replaceCharacterAttribute(companionCharSheet.get('id'), 'npc_type', pet["type"]);
                                }
                            });
                        }

                        // acTotal
                        if (CharJson.build['acTotal'] != undefined) {
                            Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), "armor_class_item", CharJson.build.acTotal['acItemBonus']);
                            let dc_rank = CharJson.build.acTotal['acProfBonus'] - CharJson.build['level'];
                            Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), "armor_class_dc_rank", dc_rank);
                            Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), "armor_class_cap", CharJson.build.acTotal['acAbilityBonus']);
                            Pathfinder2eImporter.replaceCharacterAttribute(o.get('id'), "armor_class_ability", CharJson.build.acTotal['acAbilityBonus']);
                        }
                    }
                }
                else {
                    sendChat("PathBuilder", `/w ${player} Invalid JSON code in the character ${o.get("name")} campaign notes`);
                }

            }
            else {
                // silent fail out - not a character stat block - most likely will not have a json structure inside it
            }
        }
        else {
            sendChat("PathBuilder", `/w ${player} No character sheet associated with the player`);
        }
    });
    sendChat("PathBuilder", `/w ${player} Import is completed. Please double check the character sheet.`);

};

Pathfinder2eImporter.importNPCStatBlock = function (msg) {
    let playerid = msg.playerid;
    let player = msg.who;
    let CharacterArray = Pathfinder2eImporter.getNPCCharacters();
    let Attributecounter = 1000;

    _.each(CharacterArray, (npcSheet) => {
        sendChat(`character|${npcSheet['id']}`, `/w ${player} starting my NPC stat block parsing.`);
        // npcSheet.set("bio", "");

        // npc character sheet is determined if there is a stat block in the GM section
        npcSheet.get("gmnotes", function (gmnotes) {
            if (gmnotes != null) {
                if (gmnotes.length > 0) {
                    // set player name to "GM" to prevent abuse of other tools
                    Pathfinder2eImporter.updateCharacterAttribute(npcSheet.get('id'), "toggles", "color:default");
                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "player_name", "GM");
                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "sheet_type", "npc");
                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "roll_show_notes", "[[1]]");
                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "roll_limit_height", "limit-height");
                    const removeFrontTag = /<p>/ig;
                    gmnotes = gmnotes.replace(removeFrontTag, '');
                    let lineArray = gmnotes.split("</p>");

                    let lineCounter = 0;
                    if (lineArray[lineCounter].includes(" CREATURE ")) {
                        // Creature name and level
                        sendChat(`character|${npcSheet['id']}`, `/w ${player} I am a CREATURE!`);
                        const regNameTypePattern = new RegExp(/^(?<DangerName>[a-zA-Z ,]*)(?<count> \(\d\))? (?<Type>(CREATURE)) (?<Level>.?[0-9]{1,2})/);
                        let match = regNameTypePattern.exec(lineArray[lineCounter].trim());
                        if (match != null) {
                            if (match.groups != null) {
                                npcSheet.set('name', match.groups.DangerName);
                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "npc_type", match.groups.Type);
                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "level", match.groups.Level);
                                lineCounter += 1;
                            }
                        }

                        // Traits
                        const regRaritySizeAlignmentTraits = new RegExp("^(?<Rarity>(UNCOMMON|RARE|UNIQUE) )?(?<Alignment>(CE|NE|LE|CN|N|LN|CG|NG|LG)) (?<Size>([a-zA-Z]*)) (?<Traits>(.*))");
                        match = regRaritySizeAlignmentTraits.exec(lineArray[lineCounter].trim());
                        if (match != null) {
                            if (match.groups != null) {
                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "alignment", match.groups.Alignment);
                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "size", match.groups.Size);
                                if (match.groups.Rarity != null) {
                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "traits", match.groups.Rarity.trim() + ", " + match.groups.Traits.split(' ').join(', '));
                                }
                                else {
                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "traits", match.groups.Traits);
                                }
                                lineCounter += 1;
                            }
                        }

                        // source
                        if (lineArray[lineCounter].trim().includes("Source") ||
                            lineArray[lineCounter].trim().includes("Bestiary")) {
                            lineCounter += 1; // skip the source information
                        }

                        // Perception
                        let varPerc = "";
                        while (lineArray[lineCounter].trim().startsWith("Languages") == false &&
                            lineArray[lineCounter].trim().startsWith("Skills") == false) {
                            varPerc += lineArray[lineCounter].trim() + " ";
                            lineCounter += 1;
                        }
                        const regPeceptionSenses = new RegExp("^Perception (?<Perception>(.[0-9]{1,2}))(; )?(?<Senses>(.*))?");
                        match = regPeceptionSenses.exec(varPerc);
                        if (match != null) {
                            if (match.groups != null) {
                                if (match.groups.Perception != null) {
                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "perception", match.groups.Perception);
                                }
                                if (match.groups.Senses != null) {
                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "senses", match.groups.Senses);
                                }
                                lineCounter += 1;
                            }
                        }

                        // ^Languages (?<Languages>(.*))
                        const reLang = new RegExp("^Languages (?<Languages>(.*))");
                        match = reLang.exec(lineArray[lineCounter]);
                        if (match != null) {
                            let varLang = lineArray[lineCounter].trim();
                            lineCounter += 1;
                            while (lineArray[lineCounter].trim().startsWith("Skill") == false) {
                                varLang += " " + lineArray[lineCounter].trim();
                                lineCounter += 1;
                            }
                            match = reLang.exec(varLang);
                            if (match.groups != null) {
                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "languages", match.groups.Languages);
                            }
                        }

                        // Skills
                        const regSkills = new RegExp("^Skill(s)? (?<Skills>.*)$");
                        match = regSkills.exec(lineArray[lineCounter]);
                        if (match != null) {
                            let skills = lineArray[lineCounter].trim();
                            lineCounter += 1;
                            while (lineArray[lineCounter].trim().startsWith("STR") == false &&
                                lineArray[lineCounter].trim().startsWith("Str") == false) {
                                skills += " " + lineArray[lineCounter].trim();
                                lineCounter += 1;
                            }

                            match = regSkills.exec(skills);
                            if (match.groups != null) {
                                let skillsArray = match.groups.Skills.split(", ");
                                _.each(skillsArray, (skill) => {
                                    const regSkillMod = new RegExp("^(?<Skill>([a-zA-Z ]*))(?<Modifier>.[0-9]{1,2})");
                                    let tempMatch = regSkillMod.exec(skill);
                                    if (tempMatch != null) {
                                        if (tempMatch.groups != null) {
                                            if (tempMatch.groups.Skill.includes(" Lore") || tempMatch.groups.Skill.includes("Lore ")) { // need to add NPC Lore here...
                                                // Add Lore Code here
                                            }
                                            else {
                                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], tempMatch.groups.Skill.toLowerCase().trim(), tempMatch.groups.Modifier);
                                            }
                                        }
                                    }
                                });
                            }
                        }

                        // NPC Attribute scores
                        const regAbilities = new RegExp("^(Str|STR) (?<StrMod>.[0-9]*), (Dex|DEX) (?<DexMod>.[0-9]*), (Con|CON) (?<ConMod>.[0-9]*), (Int|INT) (?<IntMod>.[0-9]*), (Wis|WIS) (?<WisMod>.[0-9]*), (Cha|CHA) (?<ChaMod>.[0-9]*)$");
                        match = regAbilities.exec(lineArray[lineCounter]);
                        if (match != null) {
                            if (match.groups != null) {
                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "strength_modifier", match.groups.StrMod);
                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "dexterity_modifier", match.groups.DexMod);
                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "constitution_modifier", match.groups.ConMod);
                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "intelligence_modifier", match.groups.IntMod);
                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "wisdom_modifier", match.groups.WisMod);
                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "charisma_modifier", match.groups.ChaMod);
                                lineCounter += 1;
                            }
                        }

                        //Items
                        if (lineArray[lineCounter].startsWith("Items ") == true ||
                            lineArray[lineCounter].startsWith("Item ") == true) {
                            let items = lineArray[lineCounter];
                            while (items.trim().endsWith(",") == true) {
                                lineCounter += 1;
                                items += " " + lineArray[lineCounter];
                            }
                            let repeatingRow = "repeating_items-worn_";
                            const regItems = new RegExp("^Item(s)? (?<Items>.*)$");
                            match = regItems.exec(items);
                            if (match != null) {
                                if (match.groups != null) {
                                    if (match.groups.Items != null)
                                        _.each(match.groups.Items.split(", "), (item) => {
                                            Attributecounter += 1;
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet["id"]}${Attributecounter}_settings`, '0');
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet["id"]}${Attributecounter}_display`, '0');
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet['id']}${Attributecounter}_toggles`, 'display,settings,');
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet['id']}${Attributecounter}_worn_item`, item);
                                        });
                                    lineCounter += 1;
                                }
                            }
                        }

                        // interaction(s)
                        while (lineArray[lineCounter].startsWith("AC ") == false) {
                            let interaction = lineArray[lineCounter];
                            Attributecounter += 1;
                            lineCounter += 1;
                            let repeatingRow = "repeating_interaction-abilities_";

                            // is the next line also part of the interaction?
                            while (lineArray[lineCounter].startsWith("AC ") == false &&
                                /^[A-Z][a-z]* [A-Z][a-z]*/.test(lineArray[lineCounter]) == false) {
                                interaction += " " + lineArray[lineCounter];
                                lineCounter += 1;
                            }
                            // sendChat(`character|${npcSheet['id']}`, `/w ${player} I have an interaction ability ${interaction}`); // keep for future debugging
                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet['id']}${Attributecounter}_settings`, '0');
                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet['id']}${Attributecounter}_display`, '0');
                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet['id']}${Attributecounter}_toggles`, 'display,settings,');
                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet['id']}${Attributecounter}_name`, Pathfinder2eImporter.getAbilityName(interaction));
                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet['id']}${Attributecounter}_description`, Pathfinder2eImporter.getAbilityDescrption(interaction));
                        }

                        // Armor and saving throws;
                        let AcLine = "";
                        while (lineArray[lineCounter].startsWith("HP ") == false) {
                            AcLine += lineArray[lineCounter] + " ";
                            lineCounter += 1;
                        }

                        const regACSaves = new RegExp("^AC (?<ArmorClass>.?[0-9]*)(?<ArmorClassNotes>.*)?; (FORT|Fort) (?<FortSave>.?[0-9]*), (REF|Ref) (?<RefSave>.?[0-9]*)(, (WILL|Will) (?<WillSave>.?[0-9]*))?(; (?<SaveNotes>.*))?$");
                        match = regACSaves.exec(AcLine);
                        if (match != null) {
                            if (match.groups != null) {
                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "armor_class", match.groups.ArmorClass);
                                if (match.groups.notes != null) {
                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "armor_class_notes", match.groups.ArmorClassNotes);
                                }
                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "saving_throws_fortitude", match.groups.FortSave);
                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "saving_throws_reflex", match.groups.RefSave);
                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "saving_throws_will", match.groups.WillSave);
                                if (match.groups.SaveNotes != null) {
                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "saving_throws_notes", match.groups.SaveNotes);
                                }
                            }
                        }

                        // Hp, Immunities, resistances and weaknesses
                        let HpLine = "";
                        while (lineArray[lineCounter].startsWith("HP") == true ||
                            lineArray[lineCounter].includes("Resistances") == true ||
                            lineArray[lineCounter].includes("Immunities") == true ||
                            lineArray[lineCounter].includes("Weaknesses") == true ||
                            HpLine.trim().endsWith("Weaknesses") == true ||
                            HpLine.trim().endsWith(",") == true) {
                            HpLine += lineArray[lineCounter] + " ";
                            lineCounter += 1;
                        }

                        //npcSheet.set("bio", `${HpLine}`);

                        const regHP = new RegExp("^HP (?<HitPoints>[0-9]*)((,|;)?(?<HP_Notes>[ a-zA-Z0-9()]*))?(; Immunities (?<Immunities>[a-zA-Z ,]*))?(; Resistances (?<Resistances>[a-zA-Z0-9, ().-]*))?(; Weaknesses (?<Weaknesses>[a-zA-Z0-9, ()]*))?");
                        match = regHP.exec(HpLine);
                        if (match != null) {
                            if (match.groups != null) {
                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "hit_points_current", match.groups.HitPoints.trim(), match.groups.HitPoints.trim());
                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "hit_points", match.groups.HitPoints.trim(), match.groups.HitPoints.trim());
                                if (match.groups.HP_Notes != null) {
                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "hit_points_notes", match.groups.HP_Notes);
                                }
                                if (match.groups.Immunities != null) {
                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "immunities", match.groups.Immunities);
                                }
                                if (match.groups.Weaknesses != null) {
                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "weaknesses", match.groups.Weaknesses);
                                }
                                if (match.groups.Resistances != null) {
                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "resistances", match.groups.Resistances);
                                }
                            }
                        }

                        // automatic and reactions
                        while (lineArray[lineCounter] != null &&
                            lineArray[lineCounter].startsWith("Melee") == false &&
                            lineArray[lineCounter].startsWith("Range") == false &&
                            lineArray[lineCounter].startsWith("Speed") == false) { // Set automatic and reaction abilities
                            let autoAndReaAbility = lineArray[lineCounter];
                            let repeatingRow = "repeating_free-actions-reactions_";
                            Attributecounter += 1;
                            lineCounter += 1;
                            while (lineArray[lineCounter].startsWith("Speed") == false &&
                                lineArray[lineCounter].includes("[reaction]") == false && // 
                                (/^[A-Z][a-z]* [A-Z][a-z]*/.test(lineArray[lineCounter]) == false ||
                                    lineArray[lineCounter].includes("Trigger ") == true ||
                                    lineArray[lineCounter].includes("Effect ") == true)) // presume all abilities start with two capital lettered words
                            { // get rest of the lines
                                autoAndReaAbility += " " + lineArray[lineCounter];
                                lineCounter += 1;
                            }
                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet['id']}${Attributecounter}_settings`, '0');
                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet['id']}${Attributecounter}_display`, '0');
                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet['id']}${Attributecounter}_toggles`, 'display,settings,');
                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet['id']}${Attributecounter}_name`, Pathfinder2eImporter.getFreeActionReactionName(autoAndReaAbility));
                            if (autoAndReaAbility.includes(" [reaction] ") == true) { // check reaction checkbox

                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet['id']}${Attributecounter}_reaction`, "1");
                                if (autoAndReaAbility.includes("(") == true && autoAndReaAbility.includes(")") == true) {
                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet['id']}${Attributecounter}_rep_traits`, Pathfinder2eImporter.getTraits(autoAndReaAbility));
                                }
                                if (autoAndReaAbility.includes("Trigger") == true) {
                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet['id']}${Attributecounter}_trigger`, Pathfinder2eImporter.getTrigger(autoAndReaAbility));
                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet['id']}${Attributecounter}_description`, Pathfinder2eImporter.getEffect(autoAndReaAbility));
                                }
                                else {
                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet['id']}${Attributecounter}_description`, Pathfinder2eImporter.getFreeActionReactionDescrption(autoAndReaAbility));
                                }

                            }
                            else { // free action checkbox
                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet['id']}${Attributecounter}_free_action`, "1");
                                if (autoAndReaAbility.includes("(") == true && autoAndReaAbility.includes(")") == true) {
                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet['id']}${Attributecounter}_rep_traits`, Pathfinder2eImporter.getTraits(autoAndReaAbility));
                                }
                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet['id']}${Attributecounter}_description`, Pathfinder2eImporter.getFreeActionReactionDescrption(autoAndReaAbility));
                            }
                        } // */

                        const regSpeed = new RegExp("^Speed (?<Speed>([0-9]* feet))?(, )?(?<Speed_Notes>(.*))$");
                        match = regSpeed.exec(lineArray[lineCounter]);
                        if (match != null) {
                            if (match.groups != null) {
                                if (match.groups.Speed != null) {
                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "speed", match.groups.Speed);
                                }
                                if (match.groups.Speed_Notes != null) {
                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "speed_notes", match.groups.Speed_Notes);
                                }
                                lineCounter += 1;
                            }
                        }
                        else {
                            sendChat(`character|${npcSheet['id']}`, `/w ${player} Speed does not appear in the expected location in the character stat block.`);
                        }// */

                        const regMelee = new RegExp(/^Melee /);
                        match = regMelee.exec(lineArray[lineCounter]);
                        if (match != null) {
                            repeatingRow = "repeating_melee-strikes_";
                            while (lineArray[lineCounter] != null &&
                                lineArray[lineCounter].startsWith("Ranged ") == false &&
                                lineArray[lineCounter].startsWith("Melee ") == true && // 
                                /^[A-Z][a-z]* [A-Z][a-z]*/.test(lineArray[lineCounter]) == false) // presume all abilities start with two capital lettered words
                            {
                                let MeleeAtk = lineArray[lineCounter];
                                Attributecounter += 1;
                                lineCounter += 1;
                                while (lineArray[lineCounter] != null &&
                                    lineArray[lineCounter].startsWith("Melee") == false &&
                                    lineArray[lineCounter].startsWith("Ranged ") == false &&
                                    /^[A-Z][a-z]* [A-Z][a-z]*/.test(lineArray[lineCounter]) == false &&
                                    lineArray[lineCounter].includes("action]") == false &&
                                    lineArray[lineCounter].includes("actions]") == false) { // collect the rest of the information
                                    MeleeAtk += " " + lineArray[lineCounter];
                                    lineCounter += 1;
                                }
                                const regMeleeAtk = new RegExp(/Melee \[one\-action\] (?<name>[a-zA-Z ]*) (?<modifier>.[0-9]+)(?<traits> \([a-zA-Z, 0-9.]*\))?, (Damage (?<damage>.?\d+d\d+(\+\d+)?) (?<damageType>[a-zA-Z]*))?(Effect (?<effect>[a-zA-Z ]*))?( and (?<ExtraDamage>[0-9a-z ]*))?( plus (?<PlusDamage>[0-9a-zA-Z ]*))?/);
                                match = regMeleeAtk.exec(MeleeAtk);

                                if (match != null) {
                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_toggles`, 'display,settings,');
                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_settings`, '0');
                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_display`, '0');
                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_weapon`, match.groups.name);
                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_weapon_strike`, match.groups.modifier);
                                    if (match.groups.traits != null) {
                                        let traits = match.groups.traits.replace("(", "").replace(")", "");
                                        Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_weapon_traits`, traits.trim());

                                        if (traits.includes("agile")) {
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_weapon_agile`, "1");
                                        }
                                        if (traits.includes("deadly")) {
                                            const regdeadly = new RegExp(/deadly (?<deadly>\d*d\d+)/);
                                            let extraDamage = regdeadly.exec(traits);
                                            if (extraDamage != null && extraDamage.groups != null && extraDamage.groups.deadly != null) {
                                                extraDamage = "[[1" + extraDamage.groups.deadly + "]] deadly";
                                                Pathfinder2eImporter.updateCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_weapon_strike_damage_additional`, extraDamage);
                                            }
                                        }
                                        if (traits.includes("jousting")) {
                                            const regdeadly = new RegExp(/jousting (?<jousting>\d*d\d+)/);
                                            let extraDamage = regdeadly.exec(traits);
                                            if (extraDamage != null && extraDamage.groups != null && extraDamage.groups.jousting != null) {
                                                extraDamage = "[[1" + extraDamage.groups.jousting + "]] jousting";
                                                Pathfinder2eImporter.updateCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_weapon_strike_damage_additional`, extraDamage);
                                            }
                                        }
                                        if (traits.includes("fatal")) {
                                            //let extraDamage = match.groups.ExtraDamage.replace(/(?<damage>\d+(d\d+(\+\d+)?)?)/g,"[[$&]]");
                                            //Pathfinder2eImporter.updateCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_weapon_strike_damage_additional`,extraDamage);
                                        }
                                    }
                                    if (match.groups.damage != null) {
                                        Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_weapon_strike_damage`, match.groups.damage);
                                    }
                                    else {
                                        Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_weapon_strike_damage`, 0);
                                    }
                                    if (match.groups.damageType != null) {
                                        Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_weapon_strike_damage_type`, match.groups.damageType);
                                    }
                                    if (match.groups.effect != null) {
                                        Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_weapon_notes`, match.groups.effect);
                                    }
                                    if (match.groups.ExtraDamage != null) {
                                        let extraDamage = match.groups.ExtraDamage.replace(/(?<damage>\d+(d\d+(\+\d+)?)?)/g, "[[$&]]");
                                        Pathfinder2eImporter.updateCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_weapon_strike_damage_additional`, extraDamage);
                                    }
                                    if (match.groups.PlusDamage != null && /^[0-9]+/.test(match.groups.PlusDamage)) {
                                        let plusDamage = match.groups.PlusDamage.replace(/(?<damage>\d+(d\d+(\+\d+)?)?)/g, "[[$&]]");
                                        Pathfinder2eImporter.updateCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_weapon_strike_damage_additional`, plusDamage);
                                    }
                                    else if (match.groups.PlusDamage != null) {
                                        Pathfinder2eImporter.updateCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_weapon_notes`, match.groups.PlusDamage);
                                    }
                                }
                                else { // log the line in the charcter information place?

                                }
                            }
                        } // */

                        const regRanged = new RegExp(/^Ranged /);
                        match = regRanged.exec(lineArray[lineCounter]);
                        if (match != null) {
                            repeatingRow = "repeating_ranged-strikes_";
                            while (lineArray[lineCounter] != null &&
                                lineArray[lineCounter].startsWith("Ranged ") == true &&
                                /^[A-Z][a-z]* [A-Z][a-z]*/.test(lineArray[lineCounter]) == false) // presume all abilities start with two capital lettered words
                            {
                                let rangedAtk = lineArray[lineCounter];
                                Attributecounter += 1;
                                lineCounter += 1;

                                while (lineArray[lineCounter] != null &&
                                    lineArray[lineCounter].startsWith("Melee") == false &&
                                    lineArray[lineCounter].startsWith("Ranged ") == false &&
                                    /^[A-Z][a-z]* [A-Z][a-z]*/.test(lineArray[lineCounter]) == false) { // collect the rest of the information
                                    rangedAtk += " " + lineArray[lineCounter];
                                    lineCounter += 1;
                                }

                                const regRangedAtk = new RegExp(/^Ranged \[one\-action\] (?<name>[a-zA-Z ]*)(?<modifier>.[0-9]+)(?<traits> \([a-zA-Z, 0-9]*\))?, (Damage (?<damage>.?\d+d\d+(\+\d+)?) (?<damageType>[a-zA-Z]*))?((Effect|Damage) (?<effect>[a-zA-Z ]*))?( and (?<ExtraDamage>[0-9a-z ]*))?( plus (?<PlusDamage>[0-9a-z ]*))?/);
                                match = regRangedAtk.exec(rangedAtk);
                                if (match != null) {
                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_toggles`, 'display,settings,');
                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_settings`, '0');
                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_display`, '0');
                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_weapon`, match.groups.name);
                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_weapon_strike`, match.groups.modifier);
                                    if (match.groups.traits != null) {
                                        let traits = match.groups.traits.replace("(", "").replace(")", "");
                                        Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_weapon_traits`, traits.trim());

                                        if (traits.includes("agile")) {
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_weapon_agile`, "1");
                                        }
                                        if (traits.includes("thrown")) {
                                            const regThrown = new RegExp(/thrown (?<range>\d+ feet)/);
                                            let tempmatch = regThrown.exec(traits);
                                            if (tempmatch != null) {
                                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_weapon_range`, tempmatch.groups.range);
                                            }
                                        }
                                        if (traits.includes("deadly")) {
                                            const regdeadly = new RegExp(/deadly (?<deadly>\d*d\d+)/);
                                            let extraDamage = regdeadly.exec(traits);
                                            if (extraDamage != null && extraDamage.groups != null && extraDamage.groups.deadly != null) {
                                                extraDamage = "[[1" + extraDamage.groups.deadly + "]] deadly";
                                                Pathfinder2eImporter.updateCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_weapon_strike_damage_additional`, extraDamage);
                                            }
                                        }
                                        if (traits.includes("fatal")) {
                                            //let extraDamage = match.groups.ExtraDamage.replace(/(?<damage>\d+(d\d+(\+\d+)?)?)/g,"[[$&]]");
                                            //Pathfinder2eImporter.updateCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_weapon_strike_damage_additional`,extraDamage);

                                        }
                                        if (traits.includes("range")) {
                                            const regThrown = new RegExp(/range increment (?<range>\d+ feet)/);
                                            let tempmatch = regThrown.exec(traits);
                                            if (tempmatch != null) {
                                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_weapon_range`, tempmatch.groups.range);
                                            }
                                        }
                                    }
                                    if (match.groups.damage != null && /\d+d\d+/.test(match.groups.damage) == true) {
                                        Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_weapon_strike_damage`, match.groups.damage);
                                    }
                                    else if (match.groups.damage != null && /[a-zA-Z ]*/.test(match.groups.damage) == true) {

                                        Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_weapon_notes`, match.groups.damage);
                                    }
                                    else {
                                        Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_weapon_strike_damage`, 0);
                                    }
                                    if (match.groups.damageType != null) {
                                        Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_weapon_strike_damage_type`, match.groups.damageType);
                                    }
                                    if (match.groups.effect != null) {
                                        Pathfinder2eImporter.updateCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_weapon_notes`, match.groups.effect);
                                    }
                                    if (match.groups.ExtraDamage != null) {
                                        let extraDamage = match.groups.ExtraDamage.replace(/(?<damage>\d+(d\d+(\+\d+)?)?)/g, "[[$&]]");
                                        Pathfinder2eImporter.updateCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_weapon_strike_damage_additional`, extraDamage);
                                    }
                                    if (match.groups.PlusDamage != null) {
                                        let plusDamage = match.groups.PlusDamage.replace(/(?<damage>\d+(d\d+(\+\d+)?)?)/g, "[[$&]]");
                                        Pathfinder2eImporter.updateCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_weapon_strike_damage_additional`, plusDamage);
                                    }
                                }
                                else { // log the line in the charcter information place?

                                }
                            }
                        } // */

                        const regSpells = new RegExp(/^(?<tradition>(Arcane|Occult|Divine|Nature)) (?<spellType>(Innate|Spontaneous|Prepared)) Spells/);
                        match = regSpells.exec(lineArray[lineCounter]);
                        if (match != null) {
                            while (lineArray[lineCounter] != null &&
                                lineArray[lineCounter].includes("Rituals") == false &&
                                lineArray[lineCounter].includes("action]") == false &&
                                ((/^[A-Z][a-z]* [A-Z][a-z]*/.test(lineArray[lineCounter]) == false
                                    || lineArray[lineCounter].includes("Spells DC ") == true))) {
                                const regSpellFull = new RegExp(/^(?<tradition>(Arcane|Occult|Divine|Nature)) (?<spellType>(Innate|Spontaneous|Prepared)) Spells DC (?<spellDC>\d+)(, attack (?<spellMod>.\d+))?;( 10th (?<tenthLvl>[a-zA-Z ,(×)0-9]*);?)?( 9th (?<ninthLvl>[a-zA-Z ,(×)0-9]*);?)?( 8th (?<eighthLvl>[a-zA-Z ,(×)0-9]*);?)?( 7th (?<seventhLvl>[a-zA-Z ,(×)0-9]*);?)?( 6th (?<sixthLvl>[a-zA-Z ,(×)0-9]*);?)?( 5th (?<fifthLvl>[a-zA-Z ,(×)0-9]*);?)?( 4th (?<fourthLvl>[a-zA-Z ,(×)0-9]*);?)?( 3rd (?<thirdLvl>[a-zA-Z ,(×)0-9]*);?)?( 2nd (?<secondLvl>[a-zA-Z ,(×)0-9]*);?)?( 1st (?<firstLvl>[a-zA-Z ,(×)0-9]*);?)?( Cantrips (?<cantrips>[a-zA-Z ,(×)0-9]*);?)?( Constant (?<constant>[a-zA-Z ,()0-9;]*)?)?/);
                                Pathfinder2eImporter.updateCharacterAttribute(npcSheet.get('id'), "toggles", "npcspellcaster");
                                let npcSpells = lineArray[lineCounter];
                                lineCounter += 1;

                                while (lineArray[lineCounter] != null &&
                                    lineArray[lineCounter].includes("Spells DC") == false &&
                                    lineArray[lineCounter].includes("Rituals") == false &&
                                    lineArray[lineCounter].includes("action]") == false &&
                                    /^[A-Z][a-z]* [A-Z][a-z]*/.test(lineArray[lineCounter]) == false) {
                                    npcSpells += " " + lineArray[lineCounter];
                                    lineCounter += 1;
                                }
                                match = regSpellFull.exec(npcSpells);

                                if (match.groups.spellType != null) {
                                    if (match.groups.spellType == "Innate") {
                                        Pathfinder2eImporter.updateCharacterAttribute(npcSheet.get('id'), "toggles", "innate");
                                        repeatingRow = "repeating_spellinnate_";
                                    }
                                    else {
                                        Pathfinder2eImporter.updateCharacterAttribute(npcSheet.get('id'), "toggles", "normalspells");
                                        repeatingRow = "repeating_normalspells_";
                                    }

                                    if (match.groups.spellType == "Spontaneous") {
                                        Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), "spellcaster_prepared", "1");
                                    }
                                    else if (match.groups.spellType == "Prepared") {
                                        Pathfinder2eImporter.updateCharacterAttribute(npcSheet.get('id'), "spellcaster_prepared", "1");
                                    }
                                }
                                if (match.groups.spellDC != null) {
                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), "spell_dc", match.groups.spellDC);
                                }
                                if (match.groups.spellMod != null) {
                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), "spell_attack", match.groups.spellMod);
                                }
                                if (match.groups.tenthLvl != null) { //repeating_normalspells
                                    let temp = match.groups.tenthLvl;
                                    const spellParse = new RegExp(/(\((?<spellSlots>\d+) slots\) )?(?<spellList>[a-zA-Z ,(×0-9)]*)?;?/);
                                    let tempMatch = spellParse.exec(temp);

                                    if (tempMatch != null && tempMatch.groups.spellList != null) {
                                        if (tempMatch.groups.spellSlots != null) {
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `level_10_per_day`, tempMatch.groups.spellSlots, tempMatch.groups.spellSlots);
                                        }

                                        _.each(tempMatch.groups.spellList.split(","), (spellName) => {
                                            Attributecounter += 1;
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_toggles`, 'display,settings,');
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_settings`, '0');
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_display`, '0');
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_current_level`, '10');
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_cast_action`, 'other');
                                            if (spellName.includes("(") && spellName.includes(")")) { // (x2)
                                                let daily_uses = spellName.slice("(" + 1, spellName.indexOf(")"));
                                                let name = spellName.slice(0, spellName.indexOf("(") - 1);
                                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_daily_uses`, daily_uses, daily_uses);
                                                // Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_daily_uses_max`, daily_uses, daily_uses);
                                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_name`, name);
                                                // @{magic_tradition}
                                                if (match.groups.tradition != null) {
                                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_magic_tradition`, match.groups.tradition);
                                                }
                                            }
                                            else {
                                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_name`, spellName);
                                            }
                                        }); // */
                                    }
                                }
                                if (match.groups.ninthLvl != null) { //repeating_normalspells
                                    let temp = match.groups.ninthLvl;
                                    const spellParse = new RegExp(/(\((?<spellSlots>\d+) slots\) )?(?<spellList>[a-zA-Z ,(×0-9)]*)?;?/);
                                    let tempMatch = spellParse.exec(temp);

                                    if (tempMatch != null && tempMatch.groups.spellList != null) {
                                        if (tempMatch.groups.spellSlots != null) {
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `level_9_per_day`, tempMatch.groups.spellSlots, tempMatch.groups.spellSlots);
                                        }

                                        _.each(tempMatch.groups.spellList.split(","), (spellName) => {
                                            Attributecounter += 1;
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_toggles`, 'display,settings,');
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_settings`, '0');
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_display`, '0');
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_current_level`, '9');
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_cast_action`, 'other');
                                            if (spellName.includes("(") && spellName.includes(")")) { // (x2)
                                                let daily_uses = spellName.slice("(" + 1, spellName.indexOf(")"));
                                                let name = spellName.slice(0, spellName.indexOf("(") - 1);
                                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_daily_uses`, daily_uses, daily_uses);
                                                // Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_daily_uses_max`, daily_uses, daily_uses);
                                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_name`, name);
                                                // @{magic_tradition}
                                                if (match.groups.tradition != null) {
                                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_magic_tradition`, match.groups.tradition);
                                                }
                                            }
                                            else {
                                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_name`, spellName);
                                            }
                                        }); // */
                                    }
                                }
                                if (match.groups.eighthLvl != null) { //repeating_normalspells
                                    let temp = match.groups.eighthLvl;
                                    const spellParse = new RegExp(/(\((?<spellSlots>\d+) slots\) )?(?<spellList>[a-zA-Z ,(×0-9)]*)?;?/);
                                    let tempMatch = spellParse.exec(temp);

                                    if (tempMatch != null && tempMatch.groups.spellList != null) {
                                        if (tempMatch.groups.spellSlots != null) {
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `level_8_per_day`, tempMatch.groups.spellSlots, tempMatch.groups.spellSlots);
                                        }

                                        _.each(tempMatch.groups.spellList.split(","), (spellName) => {
                                            Attributecounter += 1;
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_toggles`, 'display,settings,');
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_settings`, '0');
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_display`, '0');
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_current_level`, '8');
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_cast_action`, 'other');
                                            if (spellName.includes("(") && spellName.includes(")")) { // (x2)
                                                let daily_uses = spellName.slice("(" + 1, spellName.indexOf(")"));
                                                let name = spellName.slice(0, spellName.indexOf("(") - 1);
                                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_daily_uses`, daily_uses, daily_uses);
                                                // Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_daily_uses_max`, daily_uses, daily_uses);
                                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_name`, name);
                                                // @{magic_tradition}
                                                if (match.groups.tradition != null) {
                                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_magic_tradition`, match.groups.tradition);
                                                }
                                            }
                                            else {
                                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_name`, spellName);
                                            }
                                        }); // */
                                    }
                                }
                                if (match.groups.seventhLvl != null) { //repeating_normalspells
                                    let temp = match.groups.seventhLvl;
                                    const spellParse = new RegExp(/(\((?<spellSlots>\d+) slots\) )?(?<spellList>[a-zA-Z ,(×0-9)]*)?;?/);
                                    let tempMatch = spellParse.exec(temp);

                                    if (tempMatch != null && tempMatch.groups.spellList != null) {
                                        if (tempMatch.groups.spellSlots != null) {
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `level_7_per_day`, tempMatch.groups.spellSlots, tempMatch.groups.spellSlots);
                                        }

                                        _.each(tempMatch.groups.spellList.split(","), (spellName) => {
                                            Attributecounter += 1;
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_toggles`, 'display,settings,');
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_settings`, '0');
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_display`, '0');
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_current_level`, '7');
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_cast_action`, 'other');
                                            if (spellName.includes("(") && spellName.includes(")")) { // (x2)
                                                let daily_uses = spellName.slice("(" + 1, spellName.indexOf(")"));
                                                let name = spellName.slice(0, spellName.indexOf("(") - 1);
                                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_daily_uses`, daily_uses, daily_uses);
                                                // Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_daily_uses_max`, daily_uses, daily_uses);
                                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_name`, name);
                                                // @{magic_tradition}
                                                if (match.groups.tradition != null) {
                                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_magic_tradition`, match.groups.tradition);
                                                }
                                            }
                                            else {
                                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_name`, spellName);
                                            }
                                        }); // */
                                    }
                                }
                                if (match.groups.sixthLvl != null) { //repeating_normalspells
                                    let temp = match.groups.sixthLvl;
                                    const spellParse = new RegExp(/(\((?<spellSlots>\d+) slots\) )?(?<spellList>[a-zA-Z ,(×0-9)]*)?;?/);
                                    let tempMatch = spellParse.exec(temp);

                                    if (tempMatch != null && tempMatch.groups.spellList != null) {
                                        if (tempMatch.groups.spellSlots != null) {
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `level_6_per_day`, tempMatch.groups.spellSlots, tempMatch.groups.spellSlots);
                                        }

                                        _.each(tempMatch.groups.spellList.split(","), (spellName) => {
                                            Attributecounter += 1;
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_toggles`, 'display,settings,');
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_settings`, '0');
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_display`, '0');
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_current_level`, '6');
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_cast_action`, 'other');
                                            if (spellName.includes("(") && spellName.includes(")")) { // (x2)
                                                let daily_uses = spellName.slice("(" + 1, spellName.indexOf(")"));
                                                let name = spellName.slice(0, spellName.indexOf("(") - 1);
                                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_daily_uses`, daily_uses, daily_uses);
                                                // Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_daily_uses_max`, daily_uses, daily_uses);
                                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_name`, name);
                                                // @{magic_tradition}
                                                if (match.groups.tradition != null) {
                                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_magic_tradition`, match.groups.tradition);
                                                }
                                            }
                                            else {
                                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_name`, spellName);
                                            }
                                        }); // */
                                    }
                                }
                                if (match.groups.fifthLvl != null) { //repeating_normalspells
                                    let temp = match.groups.fifthLvl;
                                    const spellParse = new RegExp(/(\((?<spellSlots>\d+) slots\) )?(?<spellList>[a-zA-Z ,(×0-9)]*)?;?/);
                                    let tempMatch = spellParse.exec(temp);

                                    if (tempMatch != null && tempMatch.groups.spellList != null) {
                                        if (tempMatch.groups.spellSlots != null) {
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `level_5_per_day`, tempMatch.groups.spellSlots, tempMatch.groups.spellSlots);
                                        }

                                        _.each(tempMatch.groups.spellList.split(","), (spellName) => {
                                            Attributecounter += 1;
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_toggles`, 'display,settings,');
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_settings`, '0');
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_display`, '0');
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_current_level`, '5');
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_cast_action`, 'other');
                                            if (spellName.includes("(") && spellName.includes(")")) { // (x2)
                                                let daily_uses = spellName.slice("(" + 1, spellName.indexOf(")"));
                                                let name = spellName.slice(0, spellName.indexOf("(") - 1);
                                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_daily_uses`, daily_uses, daily_uses);
                                                // Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_daily_uses_max`, daily_uses, daily_uses);
                                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_name`, name);
                                                // @{magic_tradition}
                                                if (match.groups.tradition != null) {
                                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_magic_tradition`, match.groups.tradition);
                                                }
                                            }
                                            else {
                                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_name`, spellName);
                                            }
                                        }); // */
                                    }
                                }
                                if (match.groups.fourthLvl != null) { //repeating_normalspells
                                    let temp = match.groups.fourthLvl;
                                    const spellParse = new RegExp(/(\((?<spellSlots>\d+) slots\) )?(?<spellList>[a-zA-Z ,(×0-9)]*)?;?/);
                                    let tempMatch = spellParse.exec(temp);

                                    if (tempMatch != null && tempMatch.groups.spellList != null) {
                                        if (tempMatch.groups.spellSlots != null) {
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `level_4_per_day`, tempMatch.groups.spellSlots, tempMatch.groups.spellSlots);
                                        }

                                        _.each(tempMatch.groups.spellList.split(","), (spellName) => {
                                            Attributecounter += 1;
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_toggles`, 'display,settings,');
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_settings`, '0');
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_display`, '0');
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_current_level`, '4');
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_cast_action`, 'other');
                                            if (spellName.includes("(") && spellName.includes(")")) { // (x2)
                                                let daily_uses = spellName.slice("(" + 1, spellName.indexOf(")"));
                                                let name = spellName.slice(0, spellName.indexOf("(") - 1);
                                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_daily_uses`, daily_uses, daily_uses);
                                                // Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_daily_uses_max`, daily_uses, daily_uses);
                                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_name`, name);
                                                // @{magic_tradition}
                                                if (match.groups.tradition != null) {
                                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_magic_tradition`, match.groups.tradition);
                                                }
                                            }
                                            else {
                                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_name`, spellName);
                                            }
                                        }); // */
                                    }
                                }
                                if (match.groups.thirdLvl != null) { //repeating_normalspells
                                    let temp = match.groups.thirdLvl;
                                    const spellParse = new RegExp(/(\((?<spellSlots>\d+) slots\) )?(?<spellList>[a-zA-Z ,(×0-9)]*)?;?/);
                                    let tempMatch = spellParse.exec(temp);

                                    if (tempMatch != null && tempMatch.groups.spellList != null) {
                                        if (tempMatch.groups.spellSlots != null) {
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `level_3_per_day`, tempMatch.groups.spellSlots, tempMatch.groups.spellSlots);
                                        }

                                        _.each(tempMatch.groups.spellList.split(","), (spellName) => {
                                            Attributecounter += 1;
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_toggles`, 'display,settings,');
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_settings`, '0');
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_display`, '0');
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_current_level`, '3');
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_cast_action`, 'other');
                                            if (spellName.includes("(") && spellName.includes(")")) { // (x2)
                                                let daily_uses = spellName.slice("(" + 1, spellName.indexOf(")"));
                                                let name = spellName.slice(0, spellName.indexOf("(") - 1);
                                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_daily_uses`, daily_uses, daily_uses);
                                                // Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_daily_uses_max`, daily_uses, daily_uses);
                                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_name`, name);
                                                // @{magic_tradition}
                                                if (match.groups.tradition != null) {
                                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_magic_tradition`, match.groups.tradition);
                                                }
                                            }
                                            else {
                                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_name`, spellName);
                                            }
                                        }); // */
                                    }
                                }
                                if (match.groups.secondLvl != null) { //repeating_normalspells
                                    let temp = match.groups.secondLvl;
                                    const spellParse = new RegExp(/(\((?<spellSlots>\d+) slots\) )?(?<spellList>[a-zA-Z ,(×0-9)]*)?;?/);
                                    let tempMatch = spellParse.exec(temp);

                                    if (tempMatch != null && tempMatch.groups.spellList != null) {
                                        if (tempMatch.groups.spellSlots != null) {
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `level_2_per_day`, tempMatch.groups.spellSlots, tempMatch.groups.spellSlots);
                                        }

                                        _.each(tempMatch.groups.spellList.split(","), (spellName) => {
                                            Attributecounter += 1;
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_toggles`, 'display,settings,');
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_settings`, '0');
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_display`, '0');
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_current_level`, '2');
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_cast_action`, 'other');
                                            if (spellName.includes("(") && spellName.includes(")")) { // (x2)
                                                let daily_uses = spellName.slice("(" + 1, spellName.indexOf(")"));
                                                if (/^\+?(0|[1-9]\d*)$/.test(daily_uses) == true) {
                                                    let name = spellName.slice(0, spellName.indexOf("(") - 1);
                                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_daily_uses`, daily_uses, daily_uses);
                                                    // Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_daily_uses_max`, daily_uses, daily_uses);
                                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_name`, name);
                                                }
                                                else {
                                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_name`, spellName);
                                                }
                                                // @{magic_tradition}
                                                if (match.groups.tradition != null) {
                                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_magic_tradition`, match.groups.tradition);
                                                }
                                            }
                                            else {
                                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_name`, spellName);
                                            }
                                        }); // */
                                    }
                                }
                                if (match.groups.firstLvl != null) { //repeating_normalspells
                                    let temp = match.groups.firstLvl;
                                    const spellParse = new RegExp(/(\((?<spellSlots>\d+) slots\) )?(?<spellList>[a-zA-Z ,(×0-9)]*)?;?/);
                                    let tempMatch = spellParse.exec(temp);

                                    if (tempMatch != null && tempMatch.groups.spellList != null) {
                                        if (tempMatch.groups.spellSlots != null) {
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `level_1_per_day`, tempMatch.groups.spellSlots, tempMatch.groups.spellSlots);
                                        }

                                        _.each(tempMatch.groups.spellList.split(","), (spellName) => {
                                            Attributecounter += 1;
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_toggles`, 'display,settings,');
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_settings`, '0');
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_display`, '0');
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_current_level`, '1');
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_cast_action`, 'other');
                                            if (spellName.includes("(") && spellName.includes(")")) { // (x2)
                                                let daily_uses = spellName.slice("(" + 1, spellName.indexOf(")"));
                                                let name = spellName.slice(0, spellName.indexOf("(") - 1);
                                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_daily_uses`, daily_uses, daily_uses);
                                                // Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_daily_uses_max`, daily_uses, daily_uses);
                                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_name`, name);
                                                // @{magic_tradition}
                                                if (match.groups.tradition != null) {
                                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_magic_tradition`, match.groups.tradition);
                                                }
                                            }
                                            else {
                                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_name`, spellName);
                                            }
                                        }); // */
                                    }
                                }
                                if (match.groups.cantrips != null) { //repeating_cantrip
                                    Pathfinder2eImporter.updateCharacterAttribute(npcSheet.get('id'), "toggles", "cantrips");
                                    repeatingRow = "repeating_cantrip_";
                                    let temp = match.groups.cantrips;
                                    const spellParse = new RegExp(/\((?<spellLvl>\d+)[ndrdsth]*\)? (?<cantrips>[a-zA-Z ,]*)?/);
                                    let tempMatch = spellParse.exec(temp);
                                    if (tempMatch != null && tempMatch.groups.cantrips != null) {
                                        if (tempMatch.groups.spellLvl != null) { // attr_cantrips_per_day
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `cantrips_per_day`, tempMatch.groups.spellLvl, tempMatch.groups.spellLvl);
                                        }
                                        _.each(tempMatch.groups.cantrips.split(","), (spellName) => {
                                            Attributecounter += 1;
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_toggles`, 'display,settings,');
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_settings`, '0');
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_display`, '0');
                                            // tempMatch.groups.spellLvl
                                            if (tempMatch.groups.spellLvl != null) {
                                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_current_level`, tempMatch.groups.spellLvl);
                                            }
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_cast_action`, 'other');
                                            if (spellName.includes("(") && spellName.includes(")")) { // (x2)
                                                let daily_uses = spellName.slice("(" + 1, spellName.indexOf(")"));
                                                let name = spellName.slice(0, spellName.indexOf("(") - 1);
                                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_daily_uses`, daily_uses, daily_uses);
                                                // Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_daily_uses_max`, daily_uses, daily_uses);
                                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_name`, name);
                                                // @{magic_tradition}
                                                if (match.groups.tradition != null) {
                                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_magic_tradition`, match.groups.tradition.toUpperCase() + " Spell");
                                                }
                                            }
                                            else {
                                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_name`, spellName);
                                            }
                                        }); // */
                                    }
                                }
                                if (match.groups.constant != null) { //repeating_normalspells
                                    let temp = match.groups.constant;
                                    let spellParse = new RegExp(/ /);
                                }
                            }
                        } // */

                        // Rituals - holding off on rituals, not applicable with the current scenarios

                        // Other Offensive Abilities
                        repeatingRow = "repeating_actions-activities_";
                        // repeating_toggles ?
                        while (lineArray[lineCounter] != null) {
                            Attributecounter += 1;
                            let otherOffensiveAbilities = lineArray[lineCounter];
                            lineCounter += 1;
                            while (lineArray[lineCounter] != null &&
                                (/^[A-Z][a-z]* [A-Z][a-z]*/.test(lineArray[lineCounter]) == false ||
                                    lineArray[lineCounter].startsWith("Effect ") == true) &&
                                /^[A-Z][a-z]* \([a-z]/.test(lineArray[lineCounter]) == false &&
                                /^[A-Z][a-z]* [a-z]* \([a-z]/.test(lineArray[lineCounter]) == false &&
                                lineArray[lineCounter].includes("action]") == false &&
                                lineArray[lineCounter].includes("actions]") == false
                            ) {
                                otherOffensiveAbilities += " " + lineArray[lineCounter];
                                lineCounter += 1;
                            }

                            let regTryParseOtherOff = "";

                            if (/^[a-z]/.test(otherOffensiveAbilities) == true) {
                                regTryParseOtherOff = new RegExp(/^(?<name>[a-z]+) (\[(?<actions>[a-z]*\-action)] )?(\((?<traits>[a-z ,]*)\)(;)? )?(?<descr>.*)/);
                            }
                            else {
                                regTryParseOtherOff = new RegExp(/^(?<name>[A-Z][a-z]+ [A-Za-z]+) (\[(?<actions>[a-z]*\-action)] )?(\((?<traits>[a-z ,]*)\)(;)? )?(?<descr>[A-Za-z0-9].*)/);
                            }
                            match = regTryParseOtherOff.exec(otherOffensiveAbilities);

                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_toggles`, 'display,settings,');
                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_settings`, '0');
                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_display`, '0');
                            if (match != null && match.groups != null && match.groups.name != null) {
                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_name`, match.groups.name);
                            }
                            else {
                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_name`, Pathfinder2eImporter.getFreeActionReactionName(otherOffensiveAbilities));
                            }

                            if (match != null && match.groups != null && match.groups.descr != null) {
                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_description`, match.groups.descr);
                            }
                            else {
                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_description`, Pathfinder2eImporter.getFreeActionReactionDescrption(otherOffensiveAbilities));
                            }

                            if (match != null && match.groups != null && match.groups.actions != null) {
                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_actions`, match.groups.actions);
                            }
                            else if (otherOffensiveAbilities.includes("[") && otherOffensiveAbilities.includes("]")) {
                                let action = otherOffensiveAbilities.slice(otherOffensiveAbilities.indexOf("[") + 1, otherOffensiveAbilities.indexOf("]"));
                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_actions`, action);
                            }

                            if (match != null && match.groups != null && match.groups.traits != null) {
                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_rep_traits`, match.groups.traits);
                            }
                            else if (otherOffensiveAbilities.includes("(") && otherOffensiveAbilities.includes(")")) {
                                let traits = otherOffensiveAbilities.slice(otherOffensiveAbilities.indexOf("(") + 1, otherOffensiveAbilities.indexOf(")"));
                                if (traits.includes(" ") == false) {
                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_rep_traits`, traits);
                                }
                                else if (traits.includes(", ") == true) {
                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get("id")}${Attributecounter}_rep_traits`, traits);
                                }
                            }
                        }
                    }
                    else if (lineArray[lineCounter].includes(" HAZARD ")) {
                        sendChat(`character|${npcSheet['id']}`, `/w ${player} I am a HAZARD!`);
                        const regNameTypePattern = new RegExp(/^(?<DangerName>[a-zA-Z ,]*)(?<count> \(\d\))? (?<Type>(HAZARD)) (?<Level>.?[0-9]{1,2})/);
                        let match = regNameTypePattern.exec(lineArray[lineCounter]);
                        if (match != null) {
                            if (match.groups != null) {
                                npcSheet.set('name', match.groups.DangerName);
                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "npc_type", match.groups.Type);
                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "level", match.groups.Level);
                                lineCounter += 1;
                            }
                        }
                        const regRaritySizeAlignmentTraits = new RegExp(/^(?<Rarity>(UNCOMMON|RARE|UNIQUE) )?(?<Traits>(.*))/);
                        match = regRaritySizeAlignmentTraits.exec(lineArray[lineCounter]);
                        if (match != null) {
                            if (match.groups != null) {
                                if (match.groups.Rarity != null) {
                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "traits", match.groups.Rarity + ", " + match.groups.Traits);
                                }
                                else {
                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "traits", match.groups.Traits);
                                }
                                lineCounter += 1;
                            }
                        }

                        const regSource = new RegExp(/^(?<source>[a-zA-Z ]*)(?<page>\d+)/);
                        match = regSource.exec(lineArray[lineCounter].trim());
                        if (match != null) {
                            lineCounter += 1;
                        }

                        const regStealth = new RegExp(/^Stealth (DC |\+)(?<stealthDC>\d+)( \((?<proficiency>[a-z]*)\))?/);
                        match = regStealth.exec(lineArray[lineCounter]);
                        if (match != null) {
                            let stealthMod = 0;
                            if (lineArray[lineCounter].includes(" DC ")) {
                                stealthMod = match.groups.stealthDC - 10;
                            }
                            else {
                                stealthMod = match.groups.stealthDC;
                            }
                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "stealth", stealthMod);
                            if (match.groups.proficiency != null) {
                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "stealth_notes", match.groups.proficiency);
                            }
                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "initiative_skill", "stealth");
                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "initiative", "@{stealth}[stealth]");
                            lineCounter += 1;
                        }
                        else {
                            sendChat(`character|${npcSheet['id']}`, `/w ${player} Stealth does not appear in the expected location in the character stat block.`);
                        }

                        const regDescription = new RegExp(/^Description (?<descript>.*)/);
                        match = regDescription.exec(lineArray[lineCounter]);
                        if (match != null) {
                            let desc = lineArray[lineCounter];
                            lineCounter += 1;
                            while (lineArray[lineCounter].startsWith("Disable ") == false) {
                                desc += " " + lineArray[lineCounter];
                                lineCounter += 1;
                            }

                            match = regDescription.exec(desc.trim());
                            if (match != null && match.groups != null && match.groups.descript != null) {
                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "npc_short_description", match.groups.descript);
                            }
                        }
                        else {
                            sendChat(`character|${npcSheet['id']}`, `/w ${player} Description does not appear in the expected location in the character stat block.`);
                        }

                        const regDisable = new RegExp(/^Disable (?<descript>.*)/);
                        match = regDisable.exec(lineArray[lineCounter]);
                        if (match != null) {
                            let repeatingRow = "repeating_interaction-abilities_";
                            Attributecounter += 1;
                            let disable = lineArray[lineCounter];
                            lineCounter += 1;
                            while (lineArray[lineCounter] != null &&
                                lineArray[lineCounter].startsWith("AC ") == false &&
                                lineArray[lineCounter].includes("action]") == false) {
                                disable += " " + lineArray[lineCounter];
                                lineCounter += 1;
                            }
                            // 
                            const regDisableFull = new RegExp(/^(?<name>Disable) (?<details>.*)/);
                            match = regDisableFull.exec(disable.trim());
                            if (match != null && match.groups != null && match.groups.name != null) {
                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet['id']}${Attributecounter}_settings`, '0');
                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet['id']}${Attributecounter}_display`, '0');
                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet['id']}${Attributecounter}_toggles`, 'display,settings,');
                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet['id']}${Attributecounter}_name`, match.groups.name);
                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet['id']}${Attributecounter}_description`, match.groups.details);
                            }
                        }

                        const regACSaves = new RegExp(/^(AC (?<ArmorClass>.?[0-9]*))?((; )?(FORT|Fort) (?<FortSave>.?[0-9]*))?((, )?(REF|Ref) (?<RefSave>.?[0-9]*))?((, )?(WILL|Will) )?(?<WillSave>.?[0-9]*)(; (?<SaveNotes>.*))?$/);
                        match = regACSaves.exec(lineArray[lineCounter]);
                        if (match != null) {
                            let acSaves = lineArray[lineCounter];
                            lineCounter += 1;
                            while (lineArray[lineCounter] != null &&
                                lineArray[lineCounter].startsWith("Hardness ") == false &&
                                lineArray[lineCounter].includes("action]") == false) {
                                acSaves += " " + lineArray[lineCounter];
                                lineCounter += 1;
                            }

                            match = regACSaves.exec(acSaves.trim());
                            if (match != null && match.groups != null && match.groups.ArmorClass != null) {
                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "armor_class", match.groups.ArmorClass);
                                if (match.groups.FortSave != null) {
                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "saving_throws_fortitude", match.groups.FortSave);
                                }
                                if (match.groups.RefSave != null) {
                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "saving_throws_reflex", match.groups.RefSave);
                                }
                                if (match.groups.WillSave != null) {
                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "saving_throws_will", match.groups.WillSave);
                                }
                                if (match.groups.SaveNotes != null) {
                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "saving_throws_notes", match.groups.SaveNotes);
                                }
                            }
                        }

                        const regHardness = new RegExp(/^Hardness (?<hardness>\d+)/);
                        match = regHardness.exec(lineArray[lineCounter]);
                        if (match != null) {
                            let hardness = lineArray[lineCounter];
                            lineCounter += 1;
                            while (lineArray[lineCounter] != null &&
                                lineArray[lineCounter].includes("action]") == false &&
                                lineArray[lineCounter].includes("Routine") == false) {
                                hardness += " " + lineArray[lineCounter];
                                lineCounter += 1;
                            }
                            const regHardnessFull = new RegExp(/^Hardness (?<hardness>\d+); HP (?<hitpoints>\d+) \(BT (?<breakThresh>\d+)\)(; Immunities )?(?<Immunities>[a-zA-Z ,]*);?( Weaknesses )?(?<Weaknesses>[a-zA-Z0-9, ()]*);?( Resistances )?(?<Resistances>[a-zA-Z0-9, ().-]*)/);
                            let hp_notes = "";
                            match = regHardnessFull.exec(hardness);
                            if (match != null && match.groups != null && match.groups.hardness != null) {
                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "hit_points_current", match.groups.hitpoints.trim(), match.groups.hitpoints.trim());
                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "hit_points", match.groups.hitpoints.trim(), match.groups.hitpoints.trim());
                                if (match.groups.hardness != null) {
                                    hp_notes += `hardness ${match.groups.hardness.trim()}`;
                                }
                                if (match.groups.breakThresh != null) {
                                    hp_notes += `; HP ${match.groups.hitpoints.trim()} (BT ${match.groups.breakThresh.trim()})`;
                                }
                                if (hp_notes.length > 0) {
                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "hit_points_notes", hp_notes);
                                }
                                if (match.groups.Immunities != null) {
                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "immunities", match.groups.Immunities.trim());
                                }
                                if (match.groups.Weaknesses != null) {
                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "weaknesses", match.groups.Weaknesses);
                                }
                                if (match.groups.Resistances != null) {
                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], "resistances", match.groups.Resistances);
                                }
                            }
                        }

                        const regReactionFreeAction = new RegExp(/action]/);
                        match = regReactionFreeAction.exec(lineArray[lineCounter]);
                        if (match != null) {
                            let repeatingRow = "repeating_free-actions-reactions_";

                            while (lineArray[lineCounter] != null) {
                                let reactionFreeAction = lineArray[lineCounter];
                                lineCounter += 1;
                                Attributecounter += 1;

                                while (lineArray[lineCounter] != null &&
                                    lineArray[lineCounter].includes("action]") == false &&
                                    lineArray[lineCounter].startsWith("Reset") == false
                                ) {
                                    reactionFreeAction += " " + lineArray[lineCounter];
                                    lineCounter += 1;
                                }

                                if (reactionFreeAction.includes("[reaction]")) {
                                    repeatingRow = "repeating_free-actions-reactions_";
                                    const regReactionFreeActionFull = new RegExp(/^(?<name>[A-Z][a-z A-Z]*)\[(?<action>.*)]( \((?<traits>[a-z, ]*)\))?( Trigger (?<trigger>[a-zA-Z ,0-9]*))?(; Effect (?<effect>.*))?( (?<descr>.*))?/);
                                    match = regReactionFreeActionFull.exec(reactionFreeAction.trim());
                                    if (match != null && match.groups != null && match.groups.name != null) {
                                        Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet['id']}${Attributecounter}_settings`, '0');
                                        Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet['id']}${Attributecounter}_display`, '0');
                                        Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet['id']}${Attributecounter}_toggles`, 'display,settings,');
                                        Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet['id']}${Attributecounter}_name`, match.groups.name);

                                        if (match.groups.action != null) {
                                            if (match.groups.action == "reaction") {
                                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet['id']}${Attributecounter}_reaction`, "1");
                                            }
                                            else if (match.groups.action == "free-action") {
                                                Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet['id']}${Attributecounter}_free_action`, "1");
                                            }
                                        }

                                        if (match.groups.traits != null) {
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet['id']}${Attributecounter}_rep_traits`, match.groups.traits);
                                        }

                                        if (match.groups.trigger != null) {
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet['id']}${Attributecounter}_trigger`, match.groups.trigger);
                                        }

                                        if (match.groups.effect != null) {
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet['id']}${Attributecounter}_description`, `Effect ${match.groups.effect}`);
                                        }

                                        if (match.groups.descr != null) {
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet['id']}${Attributecounter}_description`, ` ${match.groups.descr}`);
                                        }
                                    }
                                }
                                else if (reactionFreeAction.includes("-action]")) {
                                    repeatingRow = "repeating_actions-activities_";
                                    const regReactionFreeActionFull = new RegExp(/^(?<name>[A-Z][a-z A-Z]*)\[(?<action>.*)]( \((?<traits>[a-z, ]*)\))?( Trigger (?<trigger>[a-zA-Z ,0-9]*))?(; Effect (?<effect>.*))?( (?<descr>.*))?/);
                                    match = regReactionFreeActionFull.exec(reactionFreeAction.trim());

                                    if (match != null && match.groups != null) {
                                        Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet['id']}${Attributecounter}_settings`, '0');
                                        Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet['id']}${Attributecounter}_display`, '0');
                                        Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet['id']}${Attributecounter}_toggles`, 'display,settings,');
                                        Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet['id']}${Attributecounter}_name`, match.groups.name);

                                        if (match.groups.action != null) {
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet['id']}${Attributecounter}_actions`, match.groups.action);
                                        }

                                        if (match.groups.traits != null) {
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet['id']}${Attributecounter}_rep_traits`, match.groups.traits);
                                        }

                                        if (match.groups.trigger != null) {
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet['id']}${Attributecounter}_trigger`, match.groups.trigger);
                                        }

                                        if (match.groups.effect != null) {
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet['id']}${Attributecounter}_description`, `Effect ${match.groups.effect}`);
                                        }

                                        if (match.groups.descr != null) {
                                            Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet['id']}${Attributecounter}_description`, ` ${match.groups.descr}`);
                                        }
                                    }
                                }
                                else if (reactionFreeAction.startsWith("Reset ")) {
                                    repeatingRow = "repeating_actions-activities_";
                                    const regReactionFreeActionFull = new RegExp(/^Reset (?<descr>.*)?/);
                                    match = regReactionFreeActionFull.exec(reactionFreeAction.trim());
                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet['id']}${Attributecounter}_settings`, '0');
                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet['id']}${Attributecounter}_display`, '0');
                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet['id']}${Attributecounter}_toggles`, 'display,settings,');
                                    Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet['id']}${Attributecounter}_name`, "Reset");
                                    if (match != null && match.groups != null && match.groups.descr != null) {
                                        Pathfinder2eImporter.replaceCharacterAttribute(npcSheet['id'], `${repeatingRow}${npcSheet['id']}${Attributecounter}_description`, ` ${match.groups.descr}`);
                                    }
                                }

                            }
                        }

                    }
                    else {
                        sendChat(`character|${npcSheet['id']}`, `/w ${player} I am not a CREATURE or a HAZARD.`);
                    }
                }
            }
            else { sendChat(`character|${npcSheet['id']}`, `/w ${player} NPC stat blocks are not in the GM Notes ... are you a player?`); }
        });
        sendChat(`character|${npcSheet['id']}`, `/w ${player} Completed my NPC stat block parsing.`);
    });
};

Pathfinder2eImporter.CreateHandOutInstructions = function () {
    "use strict";
    let HandOuts = findObjs({
        type: 'handout',
        name: 'Script:Pathfinder2eImporter Instructions',
    })[0];

    if (HandOuts == null) {
        let helpHandout = createObj('handout', {
            name: 'Script:Pathfinder2eImporter Instructions',
            inplayerjournals: 'all',
            archived: false
        });

        helpHandout.set({
            gmnotes: '<p>If you do not want your players using this api, please archive the handout or remove \'all\' from the In Player\'s Journals</p>' +
                '<p>!resetInit clears out the initiative tracker </p>' +
                '<p>!rollInit rolls initiative for selected tokens </p>' +
                '<p>!buildNPC attempts to parse statblocks in the notes for NPCs </p>' +
                '<p>!defaultNPCSheet configures NPC sheet, adds GM to player name, shows notes on rolls, sets height limit, and makes all npc rolls public</p>',

        });

        helpHandout.set({
            notes: '<h2>Script:Pathfinder2eImporter Instruction</h2><br />' +
                '<p>Chat Commands for the Pathfinder2eImporter API Script</p> <br />' +
                '<p><table><tr><th>Chat Command</th><th>Description</td></tr>' +
                '<tr><td>!charsheet</td><td>Creates a character sheet, making the player owner of the newly created sheet. Also makes the sheet viewable to all</td></tr>' +
                '<tr><td>!assignChar</td><td>Provides a list of characters the player can choose to have assign to themselves, also makes the character viewable to all</td></tr>' +
                '<tr><td>!importPF2</td><td>Imports JSON character information that needs to be in the Character Sheet-> Details-> Campaign Notes</td></tr>' +
                '</table></p>',
        });

    }

};

Pathfinder2eImporter.returnModifier = function (attribute_score) {
    "use strict";
    let iMod = parseInt(attribute_score);
    if (iMod != null) {
        return ((iMod - 10) / 2);
    }
    return -0;
};

Pathfinder2eImporter.getAbilityName = function (ability_string) {
    let fullName = "";
    let description = "";
    let findName = ability_string.split(" ");
    // Gets the Name and Description
    for (let i = 0; i < findName.length; i++) {
        const regFindName = new RegExp("^(?<NamePart>[A-Z][a-z]*)$");
        match = regFindName.exec(findName[i]);
        if (match == null) {
            if (fullName.length == 0) {
                for (let j = 0; j < i - 1; j++) {
                    fullName += findName[j] + " ";
                }
                description += findName[i - 1] + " " + findName[i];
            }
            else {
                description += " " + findName[i];
            }
        }
    }
    return fullName;
}

Pathfinder2eImporter.getAbilityDescrption = function (ability_string) {
    let fullName = "";
    let description = "";
    let findName = ability_string.split(" ");
    // Gets the Name and Description
    for (let i = 0; i < findName.length; i++) {
        const regFindName = new RegExp("^(?<NamePart>[A-Z][a-z]*)$");
        match = regFindName.exec(findName[i]);
        if (match == null) {
            if (fullName.length == 0) {
                for (let j = 0; j < i - 1; j++) {
                    fullName += findName[j] + " ";
                }
                description += findName[i - 1] + " " + findName[i];
            }
            else {
                description += " " + findName[i];
            }
        }
    }
    return description;
}

Pathfinder2eImporter.getTraits = function (ability_string) {
    let returnString = "";
    if (ability_string.includes("(") == true && ability_string.includes(")") == true) {
        returnString = ability_string.slice(ability_string.indexOf("(") + 1, ability_string.indexOf(")"));
    }
    return returnString;
}

Pathfinder2eImporter.getTrigger = function (ability_string) {
    let returnString = "";
    if (ability_string.includes("Trigger") == true) {
        returnString = ability_string.slice(ability_string.indexOf("Trigger ") + 8, ability_string.indexOf("Effect")).trim();
    }
    return returnString;
}

Pathfinder2eImporter.getEffect = function (ability_string) {
    let returnString = "";
    if (ability_string.includes("Effect ") == true) {
        returnString = ability_string.slice(ability_string.indexOf("Effect "));
    }
    return returnString;
}

Pathfinder2eImporter.getFreeActionReactionName = function (ability_string) {
    let fullName = "";
    if (ability_string.includes("[") == true) { // reaction, one-action, two-action, ...
        fullName = ability_string.slice(0, ability_string.indexOf("[") - 1).trim();
    }
    else if (ability_string.includes("(") == true) {
        fullName = ability_string.slice(0, ability_string.indexOf("(") - 1).trim();
    }
    else {
        fullName = Pathfinder2eImporter.getAbilityName(ability_string);
    }

    return fullName;
}

Pathfinder2eImporter.getFreeActionReactionDescrption = function (ability_string) {

    //    let extraDamage = match.groups.ExtraDamage.replace(/(?<damage>\d+(d\d+(\+\d+)?)?)/g,"[[$&]]");
    //    Pathfinder2eImporter.updateCharacterAttribute(npcSheet.get('id'), `${repeatingRow}${npcSheet.get('id')}${Attributecounter}_weapon_strike_damage_additional`,extraDamage);
    let description = "";
    if (ability_string.includes("action]")) {
        description = ability_string.slice(ability_string.indexOf("action]") + 8).replace(/(?<damage>\d+(d\d+(\+\d+)?)?)/g, "[[$&]]");
    }
    else if (ability_string.includes(")")) {
        description = ability_string.slice(ability_string.indexOf(")") + 1).trim().replace(/(?<damage>\d+(d\d+(\+\d+)?)?)/g, "[[$&]]");
    }
    else if (ability_string.includes(");")) {
        description = ability_string.slice(ability_string.indexOf(");") + 2).replace(/(?<damage>\d+(d\d+(\+\d+)?)?)/g, "[[$&]]");
    }
    else {
        description = Pathfinder2eImporter.getAbilityDescrption(ability_string).replace(/(?<damage>\d+(d\d+(\+\d+)?)?)/g, "[[$&]]");
    }

    return description;
}

Pathfinder2eImporter.rollInit = function (msg) {
    "use strict";
    // roll Initiative for selected tokens
    let description = "";

    if (msg.selected == undefined) {
        description = "Select Tokens to roll initiative.";
    }
    else {
        Campaign().set("initiativepage", true);
        _.each(msg.selected, (o) => {
            sendChat(`Pathfinder2eImporter`, `/w GM _type: ${o._type} _id: ${o._id}}`);
            let token = getObj(o._type, o._id);
            if (token == undefined) {
                sendChat(`Pathfinder2eImporter`, `/w GM token not found for ${o._id}`);
            }
            else {
                sendChat(`Pathfinder2eImporter`, `/w GM represents: ${token.get('represents')} name: ${token.get('name')}`);
                let character = getObj('character', token.get('represents'));
                if (character == undefined) {
                    sendChat(`Pathfinder2eImporter`, `/w GM token not found for ${token.get('name')}`);
                }
                else {
                    let roll = Math.floor(Math.random() * 21);
                    let turnorder = JSON.parse(Campaign().get("turnorder") || "[]");
                    const page_id = token ? token.get("pageid") : undefined;
                    var init = +roll + +getAttrByName(character.id, 'perception') + +getAttrByName(character.id, 'initiative_modifier') + +getAttrByName(character.id, 'query_roll_bonus');
                    sendChat(`character|${character.id}`, `/w GM &{template:rolls} {{limit_height=${getAttrByName(character.id, 'roll_limit_height')}}} {{charactername=${getAttrByName(character.id, 'character_name')}}} {{header=^{initiative}}} {{subheader=^{${getAttrByName(character.id, 'initiative_skill')}}}}  {{roll01=[[${roll}+(${getAttrByName(character.id, 'perception')}) + (${getAttrByName(character.id, 'initiative_modifier')})[${getAttrByName(character.id, 'text_modifier')}] + (${getAttrByName(character.id, 'query_roll_bonus')})[${getAttrByName(character.id, 'text_bonus')}] ]}} {{roll01_type=initiative}} `);
                    //Add a new custom entry to the end of the turn order.
                    turnorder.push({
                        id: token.id,
                        pr: init,
                        custom: "",
                        _pageid: page_id,
                    });
                    Campaign().set("turnorder", JSON.stringify(turnorder));
                }
            }
        });
    }

    if (description.length > 0) {
        sendChat(`Pathfinder2eImporter`, `/w GM ${description}`);
    }
}