// for cross browser
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;
let Karaoketrack;

function startKaraokeSong() {
    karaokeSong.play();
}

window.onload = (event) => {
    const karaokeSong = document.getElementById("karaokeSong")
    audioCtx = new AudioContext();
    Karaoketrack = audioCtx.createMediaElementSource(karaokeSong);

    // volume
    const gainNode = audioCtx.createGain();

    // panning
    const pannerOptions = {
        pan: 0
    };
    const panner = new StereoPannerNode(audioCtx, pannerOptions);

    // connect our graph
    Karaoketrack.connect(gainNode).connect(panner).connect(audioCtx.destination);
};
