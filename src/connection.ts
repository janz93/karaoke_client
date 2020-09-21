"use strict";

var myHostname = "karaoke-webrtc-server.herokuapp.com/";
if (!myHostname) {
    myHostname = "localhost";
}
var connection: WebSocket | null = null;
var clientID = 0;
var myUsername: string | null = null;
var targetUsername: string | null = null;
var myPeerConnection: RTCPeerConnection | null = null;

var mediaConstraints = {
    audio: true, // We want an audio track
    video: true // ...and we want a video track
};

let audioContext: AudioContext;
let audioSources: MediaStreamAudioSourceNode[] = [];
let songStream: MediaStream;

(async () => {
    try {
        songStream = await fetchSongStream()
        console.log("success");
    } catch (e) {
        console.error(e)
    }
})();


function log(text: string) {
    var time = new Date();

    console.log("[" + time.toLocaleTimeString() + "] " + text);
}

function setUsername() {
    let input = document.getElementById("name") as HTMLInputElement;
    myUsername = input.value;

    sendToServer({
        name: myUsername,
        date: Date.now(),
        id: clientID,
        type: "username"
    });
}

function connect() {
    var serverUrl;
    var scheme = "ws";

    // If this is an HTTPS connection, we have to use a secure WebSocket
    // connection too, so add another "s" to the scheme.

    if (document.location.protocol === "https:") {
        scheme += "s";
    }
    serverUrl = scheme + "://" + myHostname + ":6503";

    log(`Connecting to server: ${serverUrl}`);
    connection = new WebSocket(serverUrl, "json");

    connection.onopen = function (evt) {
        let textInput = document.getElementById("text") as HTMLInputElement;
        let sendButton = document.getElementById("send") as HTMLButtonElement;
        textInput.disabled = false;
        sendButton.disabled = false;
    };

    connection.onerror = function (evt) {
        console.dir(evt);
    }

    connection.onmessage = function (evt) {
        var chatBox = document.querySelector(".chatbox");
        var text = "";
        var msg = JSON.parse(evt.data);
        log("Message received: ");
        console.dir(msg);
        var time = new Date(msg.date);
        var timeStr = time.toLocaleTimeString();

        switch (msg.type) {
            case "id":
                clientID = msg.id;
                setUsername();
                break;

            case "username":
                text = "<b>User <em>" + msg.name + "</em> signed in at " + timeStr + "</b><br>";
                break;

            case "message":
                text = "(" + timeStr + ") <b>" + msg.name + "</b>: " + msg.text + "<br>";
                break;

            case "rejectusername":
                myUsername = msg.name;
                text = "<b>Your username has been set to <em>" + myUsername +
                    "</em> because the name you chose is in use.</b><br>";
                break;

            case "userlist": // Received an updated user list
                handleUserlistMsg(msg);
                break;

                // Signaling messages: these messages are used to trade WebRTC
                // signaling information during negotiations leading up to a video
                // call.

            case "video-offer": // Invitation and offer to chat
                handleVideoOfferMsg(msg);
                break;

            case "video-answer": // Callee has answered our offer
                handleVideoAnswerMsg(msg);
                break;

            case "new-ice-candidate": // A new ICE candidate has been received
                handleNewICECandidateMsg(msg);
                break;

            case "hang-up": // The other peer has hung up the call
                handleHangUpMsg(msg);
                break;

                // Unknown message; output to console for debugging.

            default:
                //log_error("Unknown message received:");
                //log_error(msg);
        }

        // If there's text to insert into the chat buffer, do so now, then
        // scroll the chat panel so that the new text is visible.

        if (chatBox && text.length) {
            chatBox.innerHTML += text;
            chatBox.scrollTop = chatBox.scrollHeight - chatBox.clientHeight;
        }
    };
}

function handleSendButton() {
    let textInput = document.getElementById("text") as HTMLInputElement;
    var msg = {
        text: textInput.value,
        type: "message",
        id: clientID,
        date: Date.now()
    };
    sendToServer(msg);
    textInput.value = "";
}

function sendToServer(msg: { name?: any; date?: number; id?: number; type: any; text?: any; target?: any; sdp?: any; candidate?: any; }) {
    var msgJSON = JSON.stringify(msg);
    log("Sending '" + msg.type + "' message: " + msgJSON);
    connection?.send(msgJSON);
}

function handleUserlistMsg(msg: { users: any[]; }) {
    var i;
    var listElem = document.querySelector(".userlistbox") as HTMLLIElement;

    while (listElem.firstChild) {
        listElem.removeChild(listElem.firstChild);
    }

    msg.users.forEach(function (username: string) {
        var item = document.createElement("li");
        let button = document.createElement("button");
        item.appendChild(button);
        button.appendChild(document.createTextNode(username));
        button.onclick = invite;

        listElem.appendChild(item);
    });
}

function invite(ev: MouseEvent) {
    let target = ev?.target as HTMLButtonElement;
    if (myPeerConnection) {
        alert("You can't start a call because you already have one open!");
    } else {
        var clickedUsername = target.innerText;

        if (clickedUsername === myUsername) {
            alert("I'm afraid I can't let you talk to yourself. That would be weird.");
            return;
        }

        targetUsername = clickedUsername;
        createPeerConnection();

        navigator.mediaDevices.getUserMedia(mediaConstraints)
            .then(function (localStream) {
                let localVideo = document.getElementById("localVideo") as HTMLVideoElement;
                console.log(songStream);
                console.log(audioSources);

                const mixedStreams = mixStreams([localStream, songStream])
                localVideo.srcObject = mixedStreams;

                // localStream.getTracks().forEach(
                //     track => myPeerConnection?.addTrack(track, localStream)
                // );
            })
            .catch(handleGetUserMediaError);
    }
}

async function fetchSongStream() {
    audioContext = new AudioContext();
    var gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
    gainNode.gain.value = 0; // don't play for self
    const response = await fetch( "https://mdn.github.io/webaudio-examples/audio-basics/outfoxing.mp3");
    const buf = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(buf);
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.start(0, 0 / 1000);
    source.connect(gainNode);
    const streamNode = audioContext.createMediaStreamDestination();
    source.connect(streamNode);
    const audioElem = new Audio();
    audioElem.controls = true;
    document.body.appendChild(audioElem);
    audioElem.srcObject = streamNode.stream;
    return streamNode.stream;
}
  

function mixStreams(inputStreams:MediaStream[]) {
    audioContext = new AudioContext();
    let gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
    gainNode.gain.value = 0; // don't hear self

    inputStreams.forEach(function(stream) {
        if (!stream.getTracks().filter(function(t) {
                return t.kind === 'audio';
            }).length) {
            return;
        }

        var audioSource = audioContext.createMediaStreamSource(stream);
        audioSource.connect(gainNode);
        audioSources.push(audioSource);
    });

    let audioDestination = audioContext.createMediaStreamDestination();
    audioSources.forEach(function(audioSource) {
        audioSource.connect(audioDestination);
    });
    return audioDestination.stream;
}

function handleGetUserMediaError(e: { name: any; message: string; }) {
    switch (e.name) {
        case "NotFoundError":
            alert("Unable to open your call because no camera and/or microphone" +
                "were found.");
            break;
        case "SecurityError":
        case "PermissionDeniedError":
            // Do nothing; this is the same as the user canceling the call.
            break;
        default:
            alert("Error opening your camera and/or microphone: " + e.message);
            break;
    }

    closeVideoCall();
}

function createPeerConnection() {
    myPeerConnection = new RTCPeerConnection({
        iceServers: [ // Information about ICE servers - Use your own!
            // {
            //     urls: "stun:stun.stunprotocol.org"
            // }
            {
                urls: "turn:" + myHostname, // A TURN server
                username: "webrtc",
                credential: "turnserver"
            }
        ]
    });

    myPeerConnection.onicecandidate = handleICECandidateEvent;
    myPeerConnection.ontrack = handleTrackEvent;
    myPeerConnection.onnegotiationneeded = handleNegotiationNeededEvent;
    myPeerConnection.removeTrack = handleRemoveTrackEvent;
    myPeerConnection.oniceconnectionstatechange = handleICEConnectionStateChangeEvent;
    myPeerConnection.onicegatheringstatechange = handleICEGatheringStateChangeEvent;
    myPeerConnection.onsignalingstatechange = handleSignalingStateChangeEvent;
}

function handleNegotiationNeededEvent() {
    myPeerConnection?.createOffer().then(function (offer: any) {
            return myPeerConnection?.setLocalDescription(offer);
        })
        .then(function () {
            sendToServer({
                name: myUsername,
                target: targetUsername,
                type: "video-offer",
                sdp: myPeerConnection?.localDescription
            });
        })
        .catch(reportError);
}

function handleVideoOfferMsg(msg: { name: any; sdp: RTCSessionDescriptionInit | undefined; }) {
    // var localStream: { getTracks: () => any[]; } | null = null;
    let localStream: MediaStream | null = null;

    targetUsername = msg.name;
    createPeerConnection();

    var desc = new RTCSessionDescription(msg.sdp);

    myPeerConnection?.setRemoteDescription(desc).then(function () {
            return navigator.mediaDevices.getUserMedia(mediaConstraints);
        })
        .then(function (stream: MediaStream) {
            localStream = stream;
            let localVideo = document.getElementById("localVideo") as HTMLVideoElement;
            localVideo.srcObject = localStream;

            localStream.getTracks().forEach((track: any) => myPeerConnection?.addTrack(track, localStream!));
        })
        .then(function () {
            return myPeerConnection?.createAnswer();
        })
        .then(function (answer: any) {
            return myPeerConnection?.setLocalDescription(answer);
        })
        .then(function () {
            var msg = {
                name: myUsername,
                target: targetUsername,
                type: "video-answer",
                sdp: myPeerConnection?.localDescription
            };

            sendToServer(msg);
        })
        .catch(handleGetUserMediaError);
}

function handleHangUpMsg(msg: any) {
    log("*** Received hang up notification from other peer");

    closeVideoCall();
}

function handleVideoAnswerMsg(msg: { sdp: RTCSessionDescriptionInit | undefined; }) {
    log("*** Call recipient has accepted our call");

    // Configure the remote description, which is the SDP payload
    // in our "video-answer" message.

    var desc = new RTCSessionDescription(msg.sdp);
    myPeerConnection?.setRemoteDescription(desc).catch(reportError);
}

function handleICECandidateEvent(event: { candidate: any; }) {
    if (event.candidate) {
        sendToServer({
            type: "new-ice-candidate",
            target: targetUsername,
            candidate: event.candidate
        });
    }
}

function handleNewICECandidateMsg(msg: { candidate: RTCIceCandidateInit | undefined; }) {
    var candidate = new RTCIceCandidate(msg.candidate);

    myPeerConnection?.addIceCandidate(candidate)
        .catch(reportError);
}

function handleTrackEvent(event: RTCTrackEvent) {
    let remoteVideo = document.getElementById("remoteVideo") as HTMLVideoElement;
    let hangupButton = document.getElementById("hangupButton") as HTMLButtonElement;
    remoteVideo.srcObject = event.streams[0];
    hangupButton.disabled = false;
}

function handleRemoveTrackEvent(event: any) {
    let remoteVideo = document.getElementById("remoteVideo") as HTMLVideoElement;
    var stream = remoteVideo.srcObject as MediaStream;
    var trackList = stream.getTracks();

    if (trackList.length == 0) {
        closeVideoCall();
    }
}

function hangUpCall() {
    closeVideoCall();
    sendToServer({
        name: myUsername,
        target: targetUsername,
        type: "hang-up"
    });
}

function closeVideoCall() {
    var remoteVideo = document.getElementById("remoteVideo") as HTMLVideoElement;
    var localVideo = document.getElementById("localVideo") as HTMLVideoElement;

    if (myPeerConnection) {
        myPeerConnection.ontrack = null;
        myPeerConnection.onicecandidate = null;
        myPeerConnection.oniceconnectionstatechange = null;
        myPeerConnection.onsignalingstatechange = null;
        myPeerConnection.onicegatheringstatechange = null;
        myPeerConnection.onnegotiationneeded = null;

        if (remoteVideo.srcObject) {
            (remoteVideo.srcObject as MediaStream).getTracks().forEach((track: { stop: () => any; }) => track.stop());
        }

        if (localVideo.srcObject) {
            (localVideo.srcObject as MediaStream).getTracks().forEach((track: { stop: () => any; }) => track.stop());
        }

        myPeerConnection.close();
        myPeerConnection = null;
    }

    remoteVideo.removeAttribute("src");
    remoteVideo.removeAttribute("srcObject");
    localVideo.removeAttribute("src");
    remoteVideo.removeAttribute("srcObject");

    let hangupButton = document.getElementById("hangupButton") as HTMLButtonElement;
    hangupButton.disabled = true;
    targetUsername = null;
}

function handleICEConnectionStateChangeEvent(event: any) {
    switch (myPeerConnection?.iceConnectionState) {
        case "closed":
        case "failed":
        case "disconnected":
            closeVideoCall();
            break;
    }
}

function handleSignalingStateChangeEvent(event: any) {
    switch (myPeerConnection?.signalingState) {
        case "closed":
            closeVideoCall();
            break;
    }
}

function handleICEGatheringStateChangeEvent(event: any) {
    // Our sample just logs information to console here,
    // but you can do whatever you need.
}

// Handles reporting errors. Currently, we just dump stuff to console but
// in a real-world application, an appropriate (and user-friendly)
// error message should be displayed.

function reportError(errMessage: { name: any; message: any; }) {
    //log_error(`Error ${errMessage.name}: ${errMessage.message}`);
}