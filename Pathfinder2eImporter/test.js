/*  Adds Hero Tokens Deck on command call
    Adds Macros on command call
    Allows players to add themselves to characters on commnad
    

*/

var ConfigureHaroldsCampaign = ConfigureHaroldsCampaign || {};


on("chat:message", function (msg) {

    if (msg.type == "api" && msg.content.indexOf("!Help") == 0) {
        var who = ConfigureHaroldsCampaign.idToDisplayName(msg.playerid);
        sendChat("ConfigureCampaign", `/w ${who} standard commands for the Campaign Configuration.`);
        sendChat("ConfigureCampaign", `/w ${who} !BuildHeroToken - creates Tokens to pass to players.`);
        sendChat("ConfigureCampaign", `/w ${who} !AddMacros - adds macros to the macro menu and abilities to NPC character sheets.`);


    }


    if (msg.type == "api" && msg.content.indexOf("!AddMacros") == 0) {
        var who = ConfigureHaroldsCampaign.idToDisplayName(msg.playerid);

        var Deck = findObjs({
            type: 'macro',
            name: 'HeroTokens'
        });

        if (Deck == undefined) {

        }
        else {
            sendChat("");
        }

    }

});




