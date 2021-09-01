import React, { useEffect, useState } from 'react';
import logo from './logo.svg';
import './App.css';
import { useVideoInputList } from './hooks/useVideoInputList';
import { VideoInputType } from './const';
import { DropDown, SingleValueSlider, Toggle, VideoInputSelect } from './components/components';
import { ImageScore } from '@dannadori/image-score-js'
// import { ImageScoreWasm } from '@dannadori/image-score-js/dist/image-score-wasm'
// import { ImageScoreWasmSimd } from '@dannadori/image-score-js/dist/image-score-wasm-simd'

const convertImageTypes: { [name: string]: number } = {
    "blur"   : 1,
    "grey"   : 2,
}


function App() {
    // const { wasm, wasmSimd } = useWasm()
    const { videoInputList } = useVideoInputList()

    const [ convertImageTypeKey, setConvertImageTypeKey ] = useState(Object.keys(convertImageTypes)[0])
    const [ useSIMD, setUseSIMD ]               = useState(false)
    const [ inputSize, setInputSize ]           = useState(64)
    const [ blur, setBlur]                      = useState(0)
    const [ imageScore, setImageScore ]         = useState<ImageScore>()
    // const [ imageScore, setImageScore ]         = useState<ImageScoreWasm>()
    // const [ imageScore, setImageScore ]         = useState<ImageScoreWasmSimd>()


    interface InputMedia{
        mediaType : VideoInputType
        media     : MediaStream|string
    }
    const [inputMedia, setInputMedia] = useState<InputMedia>({mediaType:"IMAGE", media:"img/yuka_kawamura.jpg"})
    const inputChange = (mediaType: VideoInputType, input:MediaStream|string) =>{
        console.log("[inputchange]", mediaType, input)
        setInputMedia({mediaType:mediaType, media:input})
    }

    useEffect(()=>{
        const is = new ImageScore()
        // const is = new ImageScoreWasm()
        // const is = new ImageScoreWasmSimd()
        is.init()
        setImageScore(is)
    },[])

    /// input設定
    useEffect(() => {
        const video = document.getElementById("input_video") as HTMLVideoElement
        if (inputMedia.mediaType === "IMAGE") {
            const img = document.getElementById("input_img") as HTMLImageElement
            img.onloadeddata = () => {
                // setLayout()
            }
            img.src = inputMedia.media as string
        } else if (inputMedia.mediaType === "MOVIE") {
            const vid = document.getElementById("input_video") as HTMLVideoElement
            vid.pause()
            vid.srcObject = null
            vid.src = inputMedia.media as string
            vid.loop = true
            vid.onloadeddata = () => {
                video.play()
                // setLayout()
            }
        } else {
            const vid = document.getElementById("input_video") as HTMLVideoElement
            vid.pause()
            vid.srcObject = inputMedia.media as MediaStream
            vid.onloadeddata = () => {
                video.play()
                // setLayout()
            }
        }
    }, [inputMedia])  // eslint-disable-line
    


    const setLayout = () =>{
        const inputElem = document.getElementById("input_img") ? document.getElementById("input_img") as HTMLImageElement : document.getElementById("input_video") as HTMLVideoElement
        const inputWidth  = inputMedia.mediaType === "IMAGE" ? (inputElem as HTMLImageElement).naturalWidth  : (inputElem as HTMLVideoElement).videoWidth 
        const inputHeight = inputMedia.mediaType === "IMAGE" ? (inputElem as HTMLImageElement).naturalHeight : (inputElem as HTMLVideoElement).videoHeight 
        const ratio = inputSize / inputWidth

        const orgWidth  = inputWidth * ratio
        const orgHeight = inputHeight * ratio

        const dst = document.getElementById("output") as HTMLCanvasElement
        const tmp = document.getElementById("tmp") as HTMLCanvasElement

        inputElem.width = orgWidth
        inputElem.height = orgHeight
        dst.width   = orgWidth
        dst.height  = orgHeight
        tmp.width = orgWidth
        tmp.height = orgHeight
    }



    //////////////////
    //  pipeline    //
    //////////////////
    useEffect(()=>{
        console.log("[Pipeline] Start")
        let renderRequestId: number
        const LOOP_ID = performance.now()

        const src = document.getElementById("input_img") as HTMLImageElement || document.getElementById("input_video") as HTMLVideoElement
        const dst = document.getElementById("output") as HTMLCanvasElement
        const tmp = document.getElementById("tmp") as HTMLCanvasElement

        const render = () => {
            // console.log("RENDER::::", LOOP_ID)
            setLayout()
            if(src.width === 0 || src.height === 0 || dst.width === 0 || dst.height === 0 ){
                renderRequestId = requestAnimationFrame(render)
                return
            }

            const tmpCtx = tmp.getContext("2d")!
            tmpCtx.drawImage(src, 0, 0, src.width, src.height)
            const dstCtx = dst.getContext("2d")!
            dstCtx.filter = `blur(${blur}px)`;
            dstCtx.drawImage(tmp, 0, 0, dst.width, dst.height)
            dstCtx.filter = 'none';


            const start = performance.now(); 

            if(imageScore){
                imageScore.setImage(tmp, dst, {useSimd:useSIMD})
                const psnr = imageScore.psnr({useSimd:useSIMD})
                const { mssimR, mssimG, mssimB, mssimA} = imageScore.mssim({useSimd:useSIMD})
    
                console.log(`${psnr}, ${mssimR}, ${mssimG}, ${mssimB}, ${mssimA}`)

                const result = document.getElementById("result") as HTMLCanvasElement
                result.innerText = `[result] psnr:${psnr.toFixed(3)}, mssimR:${mssimR.toFixed(3)}, mssimG:${mssimG.toFixed(3)}, mssimB:${mssimB.toFixed(3)}, mssimA:${mssimA.toFixed(3)}` 
                }

            const end   = performance.now();
            const duration = end - start
            const info = document.getElementById("info") as HTMLCanvasElement
            info.innerText = `[processing time] ${duration.toFixed(3)} ms` 


            renderRequestId = requestAnimationFrame(render)
        }
        render()
        return ()=>{
            cancelAnimationFrame(renderRequestId)
        }
    }, [inputMedia, convertImageTypeKey, inputSize, useSIMD, blur, imageScore ]) // eslint-disable-line



    return (
        <div>
            <div style={{display:"flex"}}>
                <div>
                    <VideoInputSelect  title="input"       current={""}             onchange={inputChange}     options={videoInputList}/>
                    {/* <DropDown          title="type"        current={convertImageTypeKey}       onchange={setConvertImageTypeKey}     options={convertImageTypes} /> */}
                    
                    <SingleValueSlider title="inputSize(w)"    current={inputSize}     onchange={setInputSize} min={64} max={256} step={16} />
                    <SingleValueSlider title="blur"         current={blur}     onchange={setBlur} min={0} max={20} step={1} />
                    <Toggle            title="SIMD"        current={useSIMD}        onchange={setUseSIMD} />
                    <div >
                        <a href="https://github.com/w-okada/image-analyze-workers">github repository</a>
                    </div>
                </div>
                <div style={{display:"flex", alignItems: "flex-start"}}>
                    {inputMedia.mediaType === "IMAGE" ? 
                        <img  id="input_img" alt=""></img>
                        :
                        <video id="input_video"></video>
                    }
                    <canvas id="output"></canvas>
                </div>
            </div>
            <div style={{display:"flex"}}>
                <canvas id="tmp" hidden></canvas>
            </div>

            <div>
                <div id="info" />
                
                <div id="result"/>
            </div>
        </div>
    )
}

export default App;
