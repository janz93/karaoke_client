const constraints = {
    video: true
};

window.onload = (event) => {
    const video = document.getElementById("foobar")
    navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
        video.srcObject = stream
    });
};