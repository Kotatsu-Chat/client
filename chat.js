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

function log(text) {
  var log = document.createElement("div")
  log.classList.add("message")
  log.innerHTML = text
  chatlog.insertBefore(log, chatlog.firstChild)
}

function displayMessage(message) {
  console.log(message)
  log(`<b>${escapeHtml(message.user.username)}</b>: ${escapeHtml(message.message.message)}`);
}


//backend stuff
const api = window.API
var options = null
var url = null
fetch('./config.json').then((response) => response.json()).then((json) => setup(json))
var loginStage = 0 //0 = username, 1 = password, 2 = done

function setup(json) { //initializes everything
  options = json
  url = options.server
  log("Enter username.")
}

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

function login() {
  api.request(url, "POST", "/api/token", {}, {username:username, password:password}, 'query').then((logid) =>
    api.receive(logid, (response) => {
      if (response.error) {
        log(`Error: ${response.error}`)
      } else {
        switch (response.status) {
          case 500:
            log(`Server unavailable.`)
            break;
          case 422:
            clear()
            log(`Invalid login.`);
            break;
          case 401:
            clear()
            log(`Authentication failed. Enter new username.`);
            loginStage = 0
            break;
          case 200:
            token = JSON.parse(response.response).access_token
            loadLatestMessages()
            break;
          default:
            log(`Unknown login error. (${response.status})`)
        }
      }
    })
  )
}

function loadLatestMessages() {  
  var parameters = {count: 50, type: -1}
  var messages = []
  api.request(url, "POST", `/api/channel/${channel}/getmessages/9223372036854775807`, parameters, null, null, token).then((loadid) =>
    api.receive(loadid, (response) => {
      if (response.error) {
        log(`Error: ${response.error}`)
      } else {
        switch (response.status) {
          case 500:
            log(`Server unavailable.`)
            break;
          case 422:
            log(`Invalid state.`);
            break;
          case 401:
            log(`Authentication failed.`)
            break;
          case 200:
            JSON.parse(response.response).forEach((element) => {
              displayMessage(element);
            });
            listen(channel)
            break;
          default:
            log(`Unknown loading error. (${response.status})`)
        }
      }
    })
  )
}

function listen(channel) {
  var listener = new WebSocket(`wss://`+url+`/api/channel/${channel}/listen`)
  listener.onmessage = (event) => {
    displayMessage(JSON.parse(event.data));
  };
}

function sendMessage(message) {  
  var channel = 1
  api.request(url, "POST", `/api/channel/${channel}/sendmessage`, {}, {message:message}, 'json', token).then((loadid) =>
    api.receive(loadid, (response) => {
      if (response.error) {
        log(`Error: ${response.error}`)
      } else {
        switch (response.status) {
          case 500:
            log(`Server unavailable.`)
            break;
          case 422:
            log(`Invalid state.`);
            break;  
          case 401:
            log(`Authentication failed.`)
            break;
          case 400:
            log(`Message too long.`)
            break;
          case 201:
            break;
          default:
            log(`Unknown message error. (${response.status})`)
        }
      }
    })
  )
}

var username = ''
var password = ''
var token = null

var channel = 1

chatbox.addEventListener("keydown", send);