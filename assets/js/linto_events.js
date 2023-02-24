window.speaking = 0
window.hotward = 0
window.streamingContent = ''
window.streamingContentPartial = ''

//############################
// MQTT Events
//############################
let mqttConnectHandler = function (event) {
    console.log("mqtt up !")
}

let mqttConnectFailHandler = function (event) {
    console.log("Mqtt failed to connect : ", event.detail)
}

let mqttErrorHandler = async function (event) {
    console.log("An MQTT error occured : ", event.detail)
    bot_off()
    await tts("Serveur ne répond pas. Veuillez recharger la page s'il vous plaît!")
    linto.resumeAudioAcquisition()
}

let mqttDisconnectHandler = function (event) {
    console.log("MQTT Offline")
}


//############################
// Command Events
//############################
let audioSpeakingOn = function (event) {
    //console.log("Speaking")
    window.speaking = 1
    if (window.speaking && window.hotward == 0)
        $(".bot-msg").effect("shake", 500, function () { });
}

let audioSpeakingOff = function (event) {
    //console.log("Not speaking")
    window.speaking = 0
}

let hotword = function (event) {
    //console.log("Hotword triggered : ", event.detail)
    bot_on()
    sound_on()
    window.hotward = 1
}

let commandAcquired = function (event) {
    // console.log("Command acquired")
    bot_pending()
    linto.pauseAudioAcquisition()
}

let commandPublished = function (event) {
    // console.log("Command published id :", event.detail)
    bot_pending()
    linto.pauseAudioAcquisition()
}

let commandTimeout = async function (event) {
    // console.log("Command timeout, id : ", event.detail)
    bot_off()
    await tts("Serveur ne répond pas. Veuillez réessayer de nouveau s'il vous plaît!")
    linto.resumeAudioAcquisition()
}

let sayFeedback = async function (event) {
    bot_off()
    sound_off()
    await tts("Veuillez s'il vous plaît utiliser les commandes convenables!")
    $("#info-releve").effect("highlight", 500);
    linto.resumeAudioAcquisition()
    window.hotward = 0
}

let askFeedback = async function (event) {
    bot_off()
    sound_off()
    await tts("Veuillez s'il vous plaît utiliser les commandes convenables!")
    $("#info-releve").effect("highlight", 500);
    linto.resumeAudioAcquisition()
    window.hotward = 0
}

//############################
// STREAMING Events
//############################
let streamingChunk = function (event) {
    if (event.detail.behavior.streaming.partial) {
        window.streamingContentPartial = capitalize(event.detail.behavior.streaming.partial.toLowerCase())
        $('#streaming').html(window.streamingContent + window.streamingContentPartial)
    }
    if (event.detail.behavior.streaming.text) {
        window.streamingContentPartial = ''
        window.streamingContent += capitalize(event.detail.behavior.streaming.text.toLowerCase()) + '. <br/>'
        $('#streaming').html(window.streamingContent)
    }
}
let streamingStart = function (event) {
    // console.log("Streaming started with no errors")
}
let streamingFinal = function (event) {
    // console.log("Streaming ended, here's the final transcript : ", event.detail.behavior.streaming.result)
}
let streamingFail = function (event) {
    //console.log("Streaming cannot start : ", event.detail)
}
