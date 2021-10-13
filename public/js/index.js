// for cross browser
const AudioContext = window.AudioContext || window.webkitAudioContext;
let context;

function startKaraokeSong() {
    karaokeSong.play();
}

// Fades between 0 (all source 1) and 1 (all source 2)
 function crossfade(element) {
    var x = parseInt(element.value) / parseInt(element.max);
    // Use an equal-power crossfading curve:
    var gain1 = Math.cos(x * 0.5 * Math.PI);
    var gain2 = Math.cos((1.0 - x) * 0.5 * Math.PI);

    console.log(gain1, gain2)
    micBlog.gainNode.gain.value = gain1;
    songBlog.gainNode.gain.value = gain2;
};


async function fetchKaraokeSongStream() {
    const audioCtx = new AudioContext();
    return await fetch("https://mdn.github.io/webaudio-examples/audio-basics/outfoxing.mp3")
    .then(resp => resp.arrayBuffer())
    .then(buf => audioCtx.decodeAudioData(buf))
    .then(audioBuffer => {
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        const streamNode = audioCtx.createMediaStreamDestination();
        source.connect(streamNode);
        console.log(streamNode.stream)
        return streamNode.stream;
    })
    .catch(console.error);
}

window.onload = (event) => {
    const karaokeSong = document.getElementById("karaokeSong")
    
    // var karaokeSongStream = fetchKaraokeSongStream();
    // console.log(karaokeSongStream)
};
