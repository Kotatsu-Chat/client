//utility
function escapeHtml(unsafe) {
  return unsafe.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

//frontend stuff
const chatlog = document.getElementById('chatlog')
const chatbox = document.getElementById('chatbox')

function clear() {
  chatlog.textContent = '';
}

const months = ['Jan','Feb','Mar','Apr','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function formatTimestamp(snowflake) {
  var timestamp = snowflake / 2**22 + 1704067200000
  var t = new Date(snowflake / 2**22 + 1704067200000); //get actual time from snowflake
  
  var time = `${t.getHours()}:${t.getMinutes().toString().padStart(2,'0')}`
  if (Date.now() - timestamp < 86400000) {
    var date = ``
  } else if (Date.now() - timestamp < (2*86400000)) {
    var date = `Yesterday at `
  } else if (Date.now().year() == t.year()) {
    var date = `${months[t.getMonth]} ${t.getDate}`
  } else {
    var date = `${t.getFullYear()}-${t.getMonth()+1}-${t.getDate()} `
  }
  return date + time
}

function log(text) {
  var log = document.createElement("div")
  log.classList.add("message")
  log.innerHTML = text
  chatlog.insertBefore(log, chatlog.firstChild)
  return log
}

function formatMessage(message) {
  return escapeHtml(message) //will be used for formatting later
}

function displayMessage(message) {
  var display = log(`<b>${escapeHtml(message.user.username)}: </b>${formatMessage(message.message.message)}`);
  var timestamp = document.createElement("small")
  timestamp.classList.add("timestamp")
  timestamp.innerHTML = formatTimestamp(message.message.snowflake)
  display.appendChild(timestamp)
}


//backend stuff
const api = window.API
var options = null
var url = null
fetch('./config.json').then((response) => response.json()).then((json) => setup(json))
var loginStage = 0 //0 = username, 1 = password, 2 = done
var username = ''
var password = ''
var token = null

function setup(json) { //initializes everything
  options = json
  url = options.server
  log("Enter username.")
}

function keydown(event) {
  if (event.key.length == 1 && document.activeElement.nodeName == "BODY") {
    chatbox.focus()
  }
}

document.addEventListener("keydown", keydown);

function send(event) {
  if (event.key == "Enter" && chatbox.value) {
    var value = chatbox.value
    chatbox.value = ""
    switch (loginStage) {
      case 0:
        username = value
        clear()
        log("Enter password.")
        loginStage = 1
        break;
      case 1:
        password = value
        loginStage = 2
        login()
        break;
      case 2:
        sendMessage(value)
    }
  }
}

chatbox.addEventListener("keydown", send);

function login() {
  api.request(url, "POST", "/api/token", {}, {username:username, password:password}, 'query').then((logid) =>
    api.receive(logid, (response) => {
      if (response.error) {
        log(`Error: ${response.error}`)
      } else {
        switch (response.status) {
          case 500:
            log(`Server unavailable. (1500)`)
            break;
          case 422:
            clear()
            log(`Invalid login. (1422)`);
            break;
          case 401:
            clear()
            log(`Authentication failed. (1401)`);
            log(`Enter new username.`);
            loginStage = 0
            break;
          case 200:
            token = JSON.parse(response.response).access_token
            joinChannel(4)
            break;
          default:
            log(`Unknown login error. (1${response.status})`)
        }
      }
    })
  )
}

var channel = 4

var arrowleft = document.getElementById('arrow-left')
var arrowright = document.getElementById('arrow-right')

arrowleft.addEventListener("click", (_event) => {joinChannel(channel-1)})
arrowright.addEventListener("click", (_event) => {joinChannel(channel+1)})

function joinChannel(target = null) {
  if (target) {channel = target};
  loadChannel();
  document.getElementById("channeltitle").innerText = `Channel ${channel}`;
  for (let i of document.getElementsByClassName("arrow")) {
    i.style.display = 'inline'
  }
}

function loadChannel() {  
  var parameters = {count: 50, type: -1}
  api.request(url, "POST", `/api/channel/${channel}/getmessages/9223372036854775807`, parameters, null, null, token).then((loadid) =>
    api.receive(loadid, (response) => {
      if (response.error) {
        log(`Error: ${response.error}`)
      } else {
        switch (response.status) {
          case 500:
            log(`Server unavailable. (2500)`)
            break;
          case 422:
            log(`Invalid state. (2422)`);
            break;
          case 401:
            log(`Authentication failed. (2401)`)
            break;
          case 204:
            log(`(This channel is empty.)`)
            break;
          case 200:
            clear()
            var messages = JSON.parse(response.response)
            messages.sort((a,b) => {
              return a.message.snowflake - b.message.snowflake
            });
            messages.forEach((element) => {
              displayMessage(element);
            });
            listen(channel)
            break;
          default:
            log(`Unknown loading error. (2${response.status})`)
        }
      }
    })
  )
}

var listener = null

function listen(channel) {
  if (listener) {listener.close(1000)}
  listener = new WebSocket(`wss://`+url+`/api/channel/${channel}/listen`)
  listener.addEventListener('message', (event) => {
    displayMessage(JSON.parse(event.data));
  });
}

function sendMessage(message) {
  api.request(url, "POST", `/api/channel/${channel}/sendmessage`, {}, {message:message}, 'json', token).then((loadid) =>
    api.receive(loadid, (response) => {
      if (response.error) {
        log(`Error: ${response.error}`)
      } else {
        switch (response.status) {
          case 500:
            log(`Server unavailable. (3500)`)
            break;
          case 422:
            log(`Invalid state. (3422)`);
            break;  
          case 401:
            log(`Authentication failed. (3401)`)
            break;
          case 400:
            log(`Message too long. (3400)`)
            break;
          case 201:
            break;
          default:
            log(`Unknown message error. (3${response.status})`)
        }
      }
    })
  )
}