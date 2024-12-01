/* eslint-disable react/prop-types */
import { useState, useEffect } from 'react'
import OpenAI from 'openai/index.mjs'

import './css/App.css'

const openai = new OpenAI({
    organization: `${import.meta.env.VITE_ORG_KEY}`,
    project: `${import.meta.env.VITE_PROJ_KEY}`,
    apiKey: `${import.meta.env.VITE_API_KEY}`,
    dangerouslyAllowBrowser: true
})

const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)
recognition.lang = "id"
recognition.continous = true;
recognition.interimResults = true;

function speak(voice, output){
    const utterance = new SpeechSynthesisUtterance(output);
    utterance.voice = voice
    speechSynthesis.speak(utterance);
}

async function SubmitInput(data, setData, memory, record, feedback, clearInput, voice){
    const userInput = document.querySelector("#textInput").value
    if( userInput.length != 0 ){
        const request = [] 
        const condition = `Kondisi saat ini adalah, lampu sedang ${data[0] == 1 ? "Menyala" : "Mati"}, AC sedang ${data[1] == 0 ? "Mati" : `beroperasi di suhu ${data[1]}`}, TV sedang ${data[2] == 0 ? "Mati" : "Menyala"}, MusicPlayer sedang ${data[3] == 0 ? "Mati" : "Menyala"}`
        request.push({
            role: "system",
            content: `${import.meta.env.VITE_PROMPT}`
        })
        request.push({
            role: "system",
            content: `${import.meta.env.VITE_COMMAND}`
        })
        request.push({
            role: "system",
            content: `${import.meta.env.VITE_ADDS}`
        })
        request.push({
            role: "system",
            content: condition
        })
        console.log(request)
        memory.push({
            role : "user",
            content : `${userInput}`
        })
        record(memory)
        request.push(...memory)
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: request
        })
        memory.push(response.choices[0].message)
        record(memory);
        const output = response.choices[0].message.content;
        let outputFR = ''
        if (output.indexOf('[') != -1){
            const startIndexDevice = output.indexOf('[')
            const endIndexDevice = output.indexOf(']')
            const device = output.slice(startIndexDevice + 1, endIndexDevice)
            const status = output.slice(endIndexDevice + 3, output.length - 1)
            outputFR = output.slice(0, startIndexDevice)
            console.log(`Command ${device} : ${status}`)
            if(device == "Lampu"){
                data[0] = status == "ON" ? 1 : 0
            } else if (device == "AC"){
                data[1] = status == "OFF" ? 0 : (status == "ON" ? 24 : status)
            } else if (device == "TV"){
                data[2] = status == "OFF" ? 0 : 1
            } else if (device == "MusicPlayer"){
                data[3] = status == "OFF" ? 0 : 1
            }
        } else{
            outputFR = output
        }
        speak(voice, outputFR)
        feedback(outputFR);
        clearInput('');
    }
}

function Response({response}){
    return (
        <>
            {response}
        </>
    )
}

let pressed;
let timeout;
let pressTime = 1;

function App() {
    const [display, setDisplay] = useState('E R I A')
    const [inputText, setInputText] = useState('');
    const [response, setResponse] = useState(`. . .`);
    const [data, setData] = useState([0, 0, 0, 0])
    const [memory, setMemory] = useState([]);
    const [voices, setVoices] = useState();
    const language = 'id-ID'
    const availableVoices = voices?.filter(({ lang }) => lang === language)[0]
    useEffect(() => {
        const voices = window.speechSynthesis.getVoices();
        if(Array.isArray(voices) && voices.length > 0){
            setVoices(voices)
            return;
        }
        if('onvoiceschanged' in window.speechSynthesis){
            window.speechSynthesis.onvoiceschanged = function(){
                const voices = window.speechSynthesis.getVoices();
                setVoices(voices);
            }
        }
    }, [])
    return (
        <div id="container">
            <div id="header">
                <img id="logo" src="../Dark BG.png"/>
            </div>
            <div id="lefticon">
                <i className='bx bx-sun'></i>
                <i className='bx bx-wind' ></i>
                <i className='bx bx-tv'></i>
                <i className='bx bx-music' ></i>
            </div>
            <div id="leftlabel">
                <p>{data[0] == 0 ? "OFF" : "ON"}</p>
                <p>{data[1] == 0 ? "OFF" : `${data[1]}°C`}</p>
                <p>{data[2] == 0 ? "OFF" : "ON"}</p>
                <p>{data[3] == 0 ? "OFF" : "ON"}</p>
            </div>
            <div id="righticon">
                <i className='bx bx-heart'></i>
                <p>O<sub>2</sub></p>
                <i className='bx bx-tachometer' ></i>
            </div>
            <div id="rightlabel">
                <p>62 BPM</p>
                <p>98%</p>
                <p>111 / 72</p>
            </div>
            <div id="response">
                <Response response={response} />
            </div>
            <div id="eria">
                <h1>{display}</h1>
            </div>
            <div id="input">
                <input 
                    id='textInput' 
                    type="text" 
                    value={inputText} 
                    autoComplete="off" 
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={e => e.key === "Enter" ? SubmitInput(data, setData, memory, setMemory, setResponse, setInputText, availableVoices) : null}
                />
                <div 
                    id='button' 
                    onMouseDown={() => {
                        pressed = false
                        if(timeout){
                            clearTimeout(timeout);
                        }
                        timeout = setTimeout(function(){
                            pressed = true
                        }, pressTime * 1000)
                    }}
                    onMouseUp={() => {
                        if(!pressed){
                            console.log("Clicked")
                            recognition.stop()
                            setDisplay("E R I A")
                            SubmitInput(data, setData, memory, setMemory, setResponse, setInputText, availableVoices)
                        }else {
                            console.log("Pressed")
                            setDisplay("Listening...")
                            const userInput = document.querySelector("#textInput")
                            recognition.start()
                            recognition.onresult = function(event){
                                userInput.value = event.results[0][0].transcript
                            }
                            recognition.onend = () => {
                                SubmitInput(data, setData, memory, setMemory, setResponse, setInputText, availableVoices)
                                setDisplay("E R I A")
                            }
                        }
                    }}
                >
                    <h1>Command</h1>
                    <div className="bg1"></div>
                    <div className="bg2"></div>
                </div>
            </div>
        </div>
    )
}

export default App