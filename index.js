//code client SySPAD
//Date: 21/01/2021
//Author: Sergio SOSA-SESMA
//Company: MobaSpace SAS
function detectMob() {
    const toMatch = [
        /Android/i,
        /webOS/i,
        /iPhone/i,
        /iPad/i,
        /iPod/i,
        /BlackBerry/i,
        /Windows Phone/i
    ];

    return toMatch.some((toMatchItem) => {
        return navigator.userAgent.match(toMatchItem);
    });
}

window.start = async function () {
    try {
        window.metadata = get_metadata()
        window.current_room = get_empty_room_data()

        window.linto = new Linto("https://sample.com/overwatch/local/web/login", window.metadata['idlinto'], 10000)
        linto.addEventListener("mqtt_connect", mqttConnectHandler)
        linto.addEventListener("mqtt_connect_fail", mqttConnectFailHandler)
        linto.addEventListener("mqtt_error", mqttErrorHandler)
        linto.addEventListener("mqtt_disconnect", mqttDisconnectHandler)
        linto.addEventListener("speaking_on", audioSpeakingOn)
        linto.addEventListener("speaking_off", audioSpeakingOff)
        linto.addEventListener("command_acquired", commandAcquired)
        linto.addEventListener("command_published", commandPublished)
        linto.addEventListener("command_timeout", commandTimeout)
        linto.addEventListener("say_feedback_from_skill", sayFeedback)
        linto.addEventListener("ask_feedback_from_skill", askFeedback)
        linto.addEventListener("streaming_start", streamingStart)
        linto.addEventListener("streaming_chunk", streamingChunk)
        linto.addEventListener("streaming_final", streamingFinal)
        linto.addEventListener("streaming_fail", streamingFail)
        linto.addEventListener("custom_action_from_skill", customHandler)
        linto.addEventListener("action_feedback", customActionHandler)
        await linto.login()
	linto.startAudioAcquisition(false, 0.99, {echoCancellation: false, autoGainControl: true, noiseSuppression: false})
        linto.startCommandPipeline()
        get_visited_rooms()
        add_custom_method()

        if(detectMob()) {
            // Bind push to talk on "touchstart" and "touchend" events
            $('#bot').on('touchstart', function(){
                $(this).removeClass('bot-off')
                $(this).addClass('bot-on')
                linto.listenCommand()
            })
            $('#bot').on('touchend', function(){
                $(this).removeClass('bot-on')
                $(this).addClass('bot-off')
                linto.sendCommandBuffer()
            })
            $('#record-mic').on('touchstart', function(){
                $(this).removeClass('off')
                $(this).addClass('on')
                linto.stopCommandPipeline()
                linto.resumeAudioAcquisition()
                linto.startStreaming()
            })
            $('#record-mic').on('touchend', function(){
                $(this).removeClass('on')
                $(this).addClass('off')
                linto.sendCommandBuffer()
            })
        } else {
            // Bind push to talk on "mousedown" and "mouseup" events
            $('#bot').mousedown(function() {
                $(this).removeClass('bot-off')
                $(this).addClass('bot-on')
                linto.listenCommand()
            })
            $('#bot').on('mouseup', function() {
                $(this).removeClass('bot-on')
                $(this).addClass('bot-off')
                linto.sendCommandBuffer()
            })
            $('#record-mic').mousedown(function() {
		$(this).removeClass('off').addClass('on')
		linto.stopCommandPipeline()
                linto.resumeAudioAcquisition()
                linto.startStreaming()
	    })
	    $('#record-mic').on('mouseup', function() {
	        $(this).removeClass('on').addClass('off')
                linto.sendCommandBuffer()
	    })
        }

        $('#stop-transmission').on('click', function () {
            linto.stopStreaming()
            linto.startCommandPipeline()
            linto.resumeAudioAcquisition()
            stop_transmission()
            bot_off()
        })
        $('.history-rooms').on('click', '.visited-room', function(){
            const id = $(this).attr('roomid')
            show_visited_room(window.rooms_history[id]['data'])
        })
        $('#modal-valider').on('click', function () {
            $('#modal-room-valider').removeClass('visible').addClass('hidden')
            save_visited_room()
            $('#modal-room-valider .modal-body').empty()
        })
        $('#modal-annuler').on('click', function () {
            $('#modal-room-valider').removeClass('visible').addClass('hidden')
            $('#modal-room-valider .modal-body').empty()
        })
        $('#content .current-releves .values').on('click', '.data-value', function(){
            const idx = $(this).attr('releve')
            releve = valid_releve_history(window.current_room['releves'][idx])
            $('#modal-editor .modal-body').attr('data-type', 'releves')
            $('#modal-editor .modal-body').attr('data-idx', idx)
            $('#modal-editor .modal-body').append(releve)
            $('#modal-editor').removeClass('hidden').addClass('visible')
        })
        $('#content .current-transmissions .values').on('click', '.data-value', function(){
            const idx = $(this).attr('trans')
            transmission = valid_transmission_history(window.current_room['transmissions'][idx], idx)
            $('#modal-editor .modal-body').attr('data-type', 'transmissions')
            $('#modal-editor .modal-body').attr('data-idx', idx)
            $('#modal-editor .modal-body').append(transmission)
            $('#modal-editor').removeClass('hidden').addClass('visible')
        })
        $('#modal-editor-valider').on('click', function(){
            type = $('#modal-editor .modal-body').attr('data-type')
            idx = $('#modal-editor .modal-body').attr('data-idx')
            data = window.current_room[type][idx]
            if (type == "releves"){
                save_releve_history(data, idx)
                update_releve_history(data)
            } else {
                save_transmission_history(idx)
                update_transmission_history(data, idx)
            }
            $('#modal-editor').removeClass('visible').addClass('hidden')
            $('#modal-editor .modal-body').empty()
        })
        $('#modal-editor-annuler').on('click', function(){
            $('#modal-editor').removeClass('visible').addClass('hidden')
            $('#modal-editor .modal-body').empty()
        })
		$('#modal-editor-supprimer').on('click',function(){
			type = $('#modal-editor .modal-body').attr('data-type')
			idx = $('#modal-editor .modal-body').attr('data-idx')
			data = null
			if (type == "releves"){
			    data = window.current_room.releves.splice(parseInt(idx), 1)
			    window.current_room.list_releves.splice(parseInt(idx), 1)
			    $('.current-releves .values').find(document.querySelector('[releve="'+ idx +'"]')).remove()
			    update_id_releves()
			}else {
			    data = window.current_room.transmissions.splice(parseInt(idx), 1)
			    $('.current-transmissions .values').find(document.querySelector('[trans="'+ idx +'"]')).remove()
			    update_id_transmissions()
			}
            $('#modal-editor').removeClass('visible').addClass('hidden')
            $('#modal-editor .modal-body').empty()
		})
        return true
    } catch (e) {
        console.log(e)
        return e.message
    }

}

start()
