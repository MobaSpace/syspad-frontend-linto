window.lintoUISound = new Audio()
window.isAndroid = navigator.userAgent.includes('Android')

const capitalize = (s) => {
    if (typeof s !== 'string') return ''
    return (s.charAt(0).toUpperCase() + s.toLowerCase().slice(1)).replace("' ", "'")
}

const tts = async function (text) {
    if (window.JSAndroid) {
        window.JSAndroid.speak(text);
    }
    else {
        await linto.say(linto.lang, text)
    }
}

const bot_off = function () {
    $(".bot-animation .bot").removeClass('bot-pending').addClass('bot-off')
    $("#thought").addClass('hidden')
}

const bot_on = function () {
    $(".bot-animation .bot").removeClass('bot-off').addClass('bot-on')
}

const bot_pending = function () {
    $(".bot-animation .bot").removeClass('bot-on').addClass('bot-pending')
    $("#thought").removeClass('hidden')
}

const sound_on = function () {
    window.lintoUISound.src = '/assets/audio/linto/beep3.wav'
    window.lintoUISound.play()
}

const sound_off = function () {
    window.lintoUISound.src = '/assets/audio/linto/beep4.wav'
    window.lintoUISound.play()
}

const start_transmission = function () {
    $('#record-mic').effect('slide', { 'direction': 'right' }, 300)
    $('#stop-transmission').effect('slide', { 'direction': 'right' }, 300)
    $("#streaming-box").effect("highlight", 500)
    $('#bot').addClass("disable")
}

const stop_transmission = function () {
    $('.record-button').text('').addClass('record-button-load')
    setTimeout(() => {
        $('#record-mic').toggle('slide', { 'direction': 'right'})
        $('#stop-transmission').toggle('slide', { 'direction': 'right' })
        $('.record-button').removeClass('record-button-load').text('Valider')
        $('#streaming').text('')
        $("#bot").removeClass("disable")

        text = (window.streamingContent + window.streamingContentPartial).replace(/<br\/>/g, '\n')

        if (window.intent == 'transmission') {
            last = window.current_room['transmissions'].length - 1
            window.current_room['transmissions'][last]['value'] = text
            add_transmission_history(window.current_room['transmissions'][last], last)
        } else if (window.intent == 'comment') {
            window.current_room['releves'][window.last_intent_idx]['comment'] = text
            add_releve_history(window.intent, '', text)
        }
        window.streamingContent = ''
        window.streamingContentPartial = ''
    }, 1500)
}

const get_visited_rooms = function () {
    intervalRoom = setInterval(async () => {
        try {
            await linto.mqtt.publish("skills/syspad-new/rooms", { idUser: window.metadata['idsoignant'] })
            clearInterval(intervalRoom)
        } catch (e) {
            console.log('linto not yet loaded')
        }
    }, 500)
}
const validate_visited_room = function () {
    $('#modal-room-valider .modal-header h2').text('Editeur de la chambre en cours')
    $('#modal-room-valider .modal-body').empty()
    $('#modal-room-valider .modal-body').append(' \
        <fieldset><legend>Chambre en cours</legend> \
            <div class="flex row"><span class="flex" style="align-items: center;padding-right: 10px;">Numéro</span> \
            <input class="flex flex1" value="'+ window.current_room['chambre'] + '" type="number" step="1" name="chambre" /></div> \
        </fieldset>')

    releve = "<fieldset><legend>Relevés dictés</legend>"
    releves = window.current_room['releves']
    if (releves.length == 0)
        releve += "<div>Pas de relevés dictés</div>"

    line_div = '<div style="border-bottom: 1px dashed; margin: 10px 0;"></div>'
    for (const [idx, data] of releves.entries()) {
        releve += valid_releve_history(data)
        releve += line_div
    }
    releve += "</fieldset>"
    $('#modal-room-valider .modal-body').append(releve)

    transmission = "<fieldset><legend>Transmissions dictées</legend>"
    transmissions = window.current_room['transmissions']
    if (transmissions.length == 0)
        transmission += "<div>Pas de transmissions dictées</div>"

    for (const [idx, data] of transmissions.entries()) {
        transmission += valid_transmission_history(data, idx)
        transmission += line_div
    }
    transmission += "</fieldset>"
    $('#modal-room-valider .modal-body').append(transmission)
    $('#modal-room-valider').removeClass('hidden').addClass('visible')
}
const update_visited_room = function () {
    update_current_room_info()
    releves = window.current_room['releves']
    for (const [idx, data] of releves.entries())
        update_releve_history(data)
    
    transmissions = window.current_room['transmissions']
    for (const [idx, data] of transmissions.entries())
        update_transmission_history(data, idx)
}
const save_visited_room = async function () {
    //update current_room values
    window.current_room['chambre'] = $("input[name='chambre']").val();

    releves = window.current_room['releves']
    for (const [idx, data] of releves.entries())
        save_releve_history(data, idx)
    
    transmissions = window.current_room['transmissions']
    for (const [idx, data] of transmissions.entries())
        save_transmission_history(idx)
    
    update_visited_room()
    console.log(window.current_room)
    await linto.mqtt.publish("skills/syspad-new/room", { obj: window.current_room })
}
const show_visited_room = function (data) {
    $('#modal-history .modal-header h2').text('Historique chambre visitée')
    $('#modal-history .history-room').empty()

    line_div = '<div style="border-bottom: 1px dashed; margin: 10px 0;"></div>'

    html = "Numéro chambre : " + data['chambre'] + "<br>"

    releves = data['releves']
    html += "<fieldset><legend>Relevés dictés</legend>"

    if (releves.length == 0)
        html += "Pas de relevés dictés"

    for (const [idx, data] of releves.entries()) {
        if (typeof data['value'] === "object") {
            sub_releve = data['value']
            for (const sub_key of Object.keys(sub_releve))
                html += data['type'] + "-" + sub_key + " : " + sub_releve[sub_key] + "<br>"
        } else {
            html += data['type'] + " : " + data['value'] + "<br>"
        }
        if (data['comment'] !== undefined) {
            html += "Commentaire : " + data['comment'] + "<br>"
        }

        html += line_div
    }
    html += "</fieldset>"

    transmissions = data['transmissions']
    html += "<fieldset><legend>Transmissions dictées</legend>"
    if (transmissions.length == 0)
        html += "Pas de transmissions dictées"
    for (const [idx, data] of transmissions.entries()) {
        html += "Type : " + data['type'] + "<br>"
        html += 'Message : ' + data['value'] + '<br>'
        html += line_div
    }
    html += "</fieldset>"

    $('#modal-history .history-room').html(html)
    $('#modal-history').removeClass('hidden').addClass('visible')
}


const valid_releve_history = function (data) {
    releve = ""
    style_css = 'style="align-items: center; width: 30%"'
    if (typeof data['value'] === "object") {
        sub_releve = data['value']
        sub_key_css = ''
        for (const [idx, sub_key] of Object.keys(sub_releve).entries()) {
            if (idx == 1)
                sub_key_css = 'style="margin-top: 5px;"'
            releve += '<div ' + sub_key_css + ' class="flex row"> \
                        <span '+ style_css + '>' + data['type'] + '-' + sub_key + '</span> \
                        <input class="flex flex1" value="' + sub_releve[sub_key] + '" type="text" name="' + data['type'] + "-" + sub_key + '" /> \
                      </div>'
        }
    } else {
        releve += '<div class="flex row"> \
                    <span '+ style_css + '>' + data['type'] + '</span> \
                    <input class="flex flex1" value="' + data['value'] + '" type="text" name="' + data['type'] + '" /> \
                  </div>'
    }

    if (data['comment'] !== undefined) {
        releve += '<div class="flex row" style="margin-top: 5px; min-height: 80px;"> \
                    <span '+ style_css + '>Commentaire</span> \
                    <textarea class="flex flex1" name="comment-text-'+ data['type'] + '">' + data['comment'] + '</textarea> \
                  </div>'
    }

    return releve
}
const valid_transmission_history = function (data, idx) {
    style_css = 'style="align-items: center; width: 30%"'
    return '<div class="flex col"> \
        <div class="flex row"><span '+ style_css + '>Type</span><input class="flex flex1" value="' + data['type'] + '" type="text" name="trans-type-' + idx + '" /></div> \
        <div class="flex row" style="margin-top: 5px; min-height: 80px;"><span '+ style_css + '>Message</span><textarea class="flex flex1" name="trans-text-' + idx + '">' + data['value'] + '</textarea></div> \
    </div>'

}
const update_releve_history = function (data) {
    css_class = data['type'].replace(' ', '_')
    if (typeof data['value'] === "object") {
        sub_releve = data['value']
        for (const sub_key of Object.keys(sub_releve))
            $('.current-releves .values .' + css_class).find('div[name=' + sub_key + ']').text(sub_releve[sub_key])
    } else {
        $('.current-releves .values .' + css_class).find('div[name=value]').text(data['value'])
    }
    if (data['comment'] !== undefined) {
        $('.current-releves .values .' + css_class).find('.comment div[name=value]').text(data['comment'])
    }
}
const update_transmission_history = function (data, idx) {
    $('.current-transmissions .values .data-value:nth-child(' + (idx + 1) + ')').find('div[name=type]').text(data['type'])
    $('.current-transmissions .values .data-value:nth-child(' + (idx + 1) + ')').find('div[name=value]').text(data['value'])
}
const save_releve_history = function(data, idx) {
    if (typeof data['value'] === "object") {
        sub_releve = data['value']
        for (const sub_key of Object.keys(sub_releve)) {
            window.current_room['releves'][idx]['value'][sub_key] = $("input[name='" + data['type'] + "-" + sub_key + "']").val()
        }
    } else {
        window.current_room['releves'][idx]['value'] = $("input[name='" + data['type'] + "']").val()
    }
    if (data['comment'] !== undefined) {
        window.current_room['releves'][idx]['comment'] = $("textarea[name='comment-text-" + data['type'] + "']").val()
    }
}
const save_transmission_history = function(idx) {
    window.current_room['transmissions'][idx]['type'] = $("input[name='trans-type-" + idx + "']").val()
    window.current_room['transmissions'][idx]['value'] = $("textarea[name='trans-text-" + idx + "']").val()
}

const add_transmission_history = function (data, idx) {
    div = '<div class="flex row data-value transmission " trans="' + idx + '"> \
                <div class="flex" name="type">' + data['type'] + '</div> \
                <div class="flex flex1 last" name="value">' + data['value'] + '</div> '
	div += '<svg class="pl-1" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/></svg>'
    div += '</div>'
    $('.current-transmissions .values').append(div)
}
const add_releve_history = function (intent, unite, data) {
    if (intent == 'comment') {
        current_intent = window.current_room['list_releves'][window.last_intent_idx]
        css_class = current_intent.replace(' ', '_')
        $('.current-releves .values .' + css_class).find('.comment').remove()
        $('.current-releves .values .' + css_class).append('<div class="flex flex1 row comment"><strong>Commentaire:&nbsp;</strong><div name="value">' + data + '</div></div>')
    } else {
        css_class = intent.replace(' ', '_')
        div = '<div class="flex col releve ' + css_class + ' data-value" releve="' + window.last_intent_idx + '"><div class="flex row"><div class="flex flex1">' + intent + '</div>'

        if (typeof data === "object") {
            for (const [idx, key] of Object.keys(data).entries()) {
                if (idx == 1)
                    div += '<div class="flex last">' + key + ':&nbsp;<div name="' + key + '">' + data[key] + '</div>' + unite + '</div>'
                else
                    div += '<div class="flex">' + key + ':&nbsp;<div name="' + key + '">' + data[key] + '</div></div>'
            }
            
        } else {
            div += '<div class="flex"><div name="value">' + data + '</div>' + unite + '</div>'
        }
		div += '<svg class="pl-1" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/></svg>'
        div += '</div>'
		idx = window.current_room['list_releves'].indexOf(intent)
        if (window.current_room['releves'][idx]['comment'] != undefined)
            div += '<div class="comment"><strong>Commentaire:</strong> <div name="value">' + window.current_room['releves'][idx]['comment'] + '</div></div>'
        div += '</div>'

        $('.current-releves .values').find('.' + css_class).remove()
        $('.current-releves .values').append(div)
    }
}
const add_room_history = function (idx, data) {
    div = `<div class="flex row visited-room" roomid="${idx}"> \
                <div class="flex1 ch">Chambre ${data.chambre}</div>\
                <div class="flex1 time">@ ${data.time}</div>\
           </div>`
    $('#history-rooms').prepend(div)
}

const update_current_room_info = function (resident = null) {
    $('.chambre-nombre').text(window.current_room['chambre'] == null ? 'NA' : window.current_room['chambre'])
    $('.chambre-resident').text(resident == null ? '' : resident)
}
const get_empty_room_data = function () {
    return {
        'chambre': null,
        'releves': [],
        'transmissions': [],
        'list_releves': [],
        'idUser': window.metadata['idsoignant']
    }
}
const get_metadata = function () {
    var queryString = window.location.search;
    var urlParam = new URLSearchParams(queryString);
    idlinto = urlParam.get('IdLinto') != null ? urlParam.get('IdLinto') : "uhAhC4adHZtJjXCv"
    idehpad = urlParam.get('IdEhpad') != null ? urlParam.get('IdEhpad') : "ehpad"
    idsoignant = urlParam.get('IdUser') != null ? urlParam.get('IdUser') : "796c9564-f989-4f6a-ab29-719b8c58a9dc"
    namesoignant = urlParam.get('UserFirstName') != null ? urlParam.get('UserFirstName') : "test.test"
    $('.idSoignant').text('Bonjour ' + capitalize(namesoignant))
    $('.idEhpad').text(` @${idehpad}`)
    return {
        'idsoignant': idsoignant,
        'fullname': namesoignant,
        'idehpad': idehpad,
        'idlinto': idlinto
    }
}

const add_custom_method = function() {
	
    window.current_room.list_releves.onUpdate = function() {
        update_counter_releves()
    }
		
    window.current_room.list_releves.splice = function(element, nbelem) {
        Array.prototype.splice.call(this, element, nbelem)
        this.onUpdate()
    }
		
    window.current_room.list_releves.push = function(item) {
        Array.prototype.push.call(this,item)
        this.onUpdate()
    }
	
    window.current_room.transmissions.onUpdate = function() {
        update_counter_transmissions()
    }

    window.current_room.transmissions.splice = function(element, nbelem) {
        Array.prototype.splice.call(this, element, nbelem)
        this.onUpdate()
    }

    window.current_room.transmissions.push = function(item) {
        Array.prototype.push.call(this,item)
        this.onUpdate()
    }

}

const update_counter_releves = function() {
	document.getElementById('NbReleves').innerText = "(" + window.current_room.list_releves.length + ")"
}

const update_counter_transmissions = function() {
	document.getElementById('NbTransmissions').innerText = "(" + window.current_room.transmissions.length + ")"
}

const update_id_releves = function() {
    tabreleves = window.document.getElementsByClassName("releve")
    for (var i = 0; i < tabreleves.length; i++)
    {
	if (tabreleves[i].getAttribute('releve') != i )
	{
	    tabreleves[i].setAttribute('releve', i)
	}	
    }		
}

const update_id_transmissions = function() {
    tabtrans =  window.document.getElementsByClassName("transmission")
    for (var i = 0; i < tabtrans.length; i++)
    {
	if (tabtrans[i].getAttribute('trans') != i )
	{
	    tabtrans[i].setAttribute('trans', i)
	}	
    }	
   
}
