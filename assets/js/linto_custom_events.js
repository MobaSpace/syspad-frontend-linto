window.intent = ''
window.data = ''
window.last_releve = null
window.rooms_history = []

//############################
// SYSPAD Skills Event
//############################
let customActionHandler = async function (event) {
    console.log(event.detail.behavior)
    intent = event.detail.behavior.customAction.kind

    switch (intent) {
        case 'save':
            const time = new Date().toLocaleTimeString().replace(/([\d]+:[\d]{2})(:[\d]{2})(.*)/, "$1$3")
            idx = window.rooms_history.length
            window.rooms_history.push({ id: idx, data: window.current_room })
            add_room_history(idx, { chambre: window.current_room['chambre'], time: time })
            $('.current-releves .values').empty()
            $('.current-transmissions .values').empty()
            window.current_room = get_empty_room_data()
            update_current_room_info()
            add_custom_method()
            update_counter_releves()
            update_counter_transmissions()
            linto.resumeAudioAcquisition()
            tts('chambre fermée')
            break;
        case 'error':
            await tts(event.detail.behavior.say.text)
            linto.resumeAudioAcquisition()
            break;
        case 'rooms':
            list = event.detail.behavior.customAction.data.list
            for (const [idx, data] of list.entries()) {
                date = new Date(data['time']).toLocaleDateString()
                today = new Date().toLocaleDateString()
                if (today === date)
                    data['time'] = new Date(data['time']).toLocaleTimeString().replace(/([\d]+:[\d]{2})(:[\d]{2})(.*)/, "$1$3")
                else
                    data['time'] = new Date(data['time']).toLocaleString().replace(/([^ ]* )([\d]+:[\d]{2})(:[\d]{2})(.*)/, "$1$2$4")
                window.rooms_history.push({ id: idx, data: data })
                add_room_history(idx, data)
            }
            break;
        default:
            break;
    }
}


let customHandler = async function (event) {
    console.log(event.detail.behavior)
    bot_off()

    intent = event.detail.behavior.customAction.kind

    switch (intent) {
        case 'error':
            await tts(event.detail.behavior.say.text)
            linto.resumeAudioAcquisition()
            break;
        case 'openroom':
            if (window.current_room['chambre'] == null) {
                window.current_room['chambre'] = event.detail.behavior.customAction.data
                update_current_room_info(event.detail.behavior.customAction.resident)
                tts('chambre ouverte')
            }
            else
                tts('chambre déjà ouverte')
            linto.resumeAudioAcquisition()
            break;
        case 'closeroom':
            if (window.current_room['chambre'] != null) {
                validate_visited_room()
                tts(event.detail.behavior.say.text)
            }
            else
                tts('pas de chambre ouverte')
            linto.resumeAudioAcquisition()
            break;
        case 'quitroom':
            $('.current-releves .values').empty()
            $('.current-transmissions .values').empty()
            window.current_room = get_empty_room_data()
            update_current_room_info()
	    add_custom_method()
            update_counter_releves()
	    update_counter_transmissions()
            tts('chambre abandonnée')
            linto.resumeAudioAcquisition()
            break;
        default:
            if (window.current_room['chambre'] != null) {
                if (intent == 'transmission') {
                    setTimeout(() => {
                        elem = {
                            type: event.detail.behavior.customAction.data,
                            value: ''
                        }
                        window.current_room['transmissions'].push(elem)
                        start_transmission()
                    }, 4000)
                    await tts(event.detail.behavior.say.text)
                } else if (intent == 'comment') {
                    if (window.current_room['list_releves'].length != 0) {
                        setTimeout(() => {
                            start_transmission()
                        }, 4000)
                        await tts(event.detail.behavior.say.text)
                    } else {
                        await tts("Veuillez dicter le relevé avant d'utiliser le commentaire!")
                    }
                } else {
                    //releves
                    data = event.detail.behavior.customAction.data
                    unite = event.detail.behavior.customAction.unite
                    if (data !== null) {
                        idx = window.current_room['list_releves'].indexOf(intent)
                        if (idx == -1) {
                            window.current_room['releves'].push({
                                type: intent,
                                value: data
                            })
                            window.current_room['list_releves'].push(intent)
                            idx = window.current_room['list_releves'].length - 1
                        }
                        else
                            window.current_room['releves'][idx]['value'] = data

                        window.last_intent_idx = idx
                        add_releve_history(intent, unite, data)
                    }
                }
            } else {
                tts('pas de chambre ouverte')
            }
            linto.resumeAudioAcquisition()
            break;
    }
}
