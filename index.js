const constraints = {
    video: true,
    audio: true
};

window.onload = (event) => {
    const video = document.getElementById("foobar")
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    context = new AudioContext();
    navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
        video.srcObject = stream
        const microphone = context.createMediaStreamSource(stream);
        const filter = context.createBiquadFilter();
        // microphone -> filter -> destination
        microphone.connect(filter);
        filter.connect(context.destination);
    });
};