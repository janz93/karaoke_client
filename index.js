window.onload = (event) => {
    const video = document.getElementById("foobar")
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    context = new AudioContext();
    navigator.mediaDevices.enumerateDevices().then((devices) => {
        devices = devices.filter((d) => d.kind === 'audioinput');
        console.log(devices)
        navigator.mediaDevices.getUserMedia({
            audio: {
                deviceId: devices[0].deviceId
            },
            video: true
        }).then((stream) => {
            video.srcObject = stream
            const microphone = context.createMediaStreamSource(stream);
            const filter = context.createBiquadFilter();
            // microphone -> filter -> destination
            microphone.connect(filter);
            filter.connect(context.destination);
        });
    });  
};
