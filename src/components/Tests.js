import React, { useState } from 'react'
import {Modal, Button, Form} from 'react-bootstrap'

const formatDate = (d) => {
    d = new Date(d)
    const D = d.getUTCDate().toString().padStart(2, '0')
    const M = (d.getUTCMonth() + 1).toString().padStart(2, '0')
    const Y = d.getUTCFullYear().toString().slice(-2)
    const h = d.getUTCHours().toString().padStart(2, '0')
    const m = d.getUTCMinutes().toString().padStart(2, '0')
    const s = d.getUTCSeconds().toString().padStart(2, '0')
    return `${D}/${M}/${Y} ${h}:${m}:${s}`
}

const formatTime = (time) => {
    const hours = Math.floor(time / (60 * 60 * 1000))
    const minutes = Math.floor((time % (60 * 60 * 1000)) / (60 * 1000))
    const seconds = (time % (60 * 1000)) / 1000
    return (hours === 0 ? '' : `${hours}h`)
        + (minutes === 0 ? '' : `${minutes.toString().padStart(2, '0')}m`)
        + `${seconds.toFixed(2)}s`
}

const Tests = (props) => {
    const { tests, setTests, dcmFetch } = props
    const { show, net, source, target } = tests
    const { nodes } = net
    const [ state, setState ] = useState({ rounds: 5, logs: '', results: '', stage: 'stopped' })

    const start = () => {
        state.stage = 'ongoing'
        setState({...state})
        test()
    }

    const stop = () => {
        state.stage = 'stopped'
        setState({...state})
    }

    const clear = () => {
        state.logs = ''
        state.results = ''
        setState({...state})
    }

    const test = async () => {
        const scroll = () => {
            const textareas = document.getElementsByTagName('textarea')
            for (let i = 0; i < textareas.length; i++) {
                const textarea = textareas[i]
                textarea.scrollTop = textarea.scrollHeight;
            }
        }
        const log = (data) => {
            state.logs += data + '\n'
            setState({...state})
            scroll()
        }
        const result = (data) => {
            state.results += data + '\n'
            setState({...state})
            scroll()
        }
        let round = 0
        result('elapsed_time')
        while(round < state.rounds){
            round++
            log(`Round #${round}`)
            const nSourceFiles = await new Promise((resolve, reject) => {
                dcmFetch(`${source.apiprotocol}://${source.host}:${source.apiport}/scpfilescount`, {name: source.name}, data => resolve(data))
            })
            if(!nSourceFiles){
                log(`no SCP files found on source ${source.name}`)
                break 
            }
            log(`source's #files: ${nSourceFiles}`)
            log(`- disconnect source: ${formatDate(new Date())}`)
            await new Promise((resolve, reject) => {
                dcmFetch(`${source.apiprotocol}://${source.host}:${source.apiport}/node`, {method: 'DELETE', name: source.name, body: {}}, resolve)
            })
            source.nodes = []
            log(`- disconnect target: ${formatDate(new Date())}`)
            await new Promise((resolve, reject) => {
                dcmFetch(`${target.apiprotocol}://${target.host}:${target.apiport}/node`, {method: 'DELETE', name: target.name, body: {}}, resolve)
            })
            target.nodes = []
            log(`- clean SCP target: ${formatDate(new Date())}`)
            await new Promise((resolve, reject) => {
                dcmFetch(`${target.apiprotocol}://${target.host}:${target.apiport}/cleanscp`, {method: 'DELETE', name: target.name}, resolve)
            })
            /*log(`- clean metadata target: ${formatDate(new Date())}`)
            await new Promise((resolve, reject) => {
                dcmFetch(`${target.apiprotocol}://${target.host}:${target.apiport}/file`, {method: 'DELETE', name: target.name, body: {names:[]}}, resolve)
            })*/
            log(`- source -> target: ${formatDate(new Date())}`)
            await new Promise((resolve, reject) => {
                const body = {
                    host: target.host,
                    scpport: target.scpport,
                    apiport: target.apiport,
                    name: target.name,
                    apiprotocol: target.apiprotocol
                }
                dcmFetch(`${source.apiprotocol}://${source.host}:${source.apiport}/node`, {method: 'POST', name: source.name, body}, resolve)
            })
            const startTime = new Date()
            let nTargetFiles = 0
            while(nTargetFiles < nSourceFiles){
                if(state.stage !== 'ongoing')
                    return
                await new Promise(resolve => setTimeout(resolve, 2000)) // 2s
                nTargetFiles = await new Promise(resolve => {
                    dcmFetch(`${target.apiprotocol}://${target.host}:${target.apiport}/scpfilescount`, {name: target.name}, data => resolve(data))
                    setTimeout(resolve, 5000)
                }) || 0
                console.log(`ongoing: ${nTargetFiles} of ${nSourceFiles}`)
            }
            const elapsed = new Date() - startTime
            log(`Done #${round} target's #files: ${nTargetFiles} elapsed time: ${formatTime(new Date(elapsed))}`)
            result(elapsed.toString())
        }
        scroll()
        log('Test finished')
        state.stage = 'stopped'
        setState({...state})
    }

    return (
        <Modal show={show} onHide={() => setTests({...tests, show: false })} dialogClassName="modal-tests">
            <Modal.Header closeButton>
                <Modal.Title>Reliablity Tests</Modal.Title>
            </Modal.Header>
            <Modal.Body style={{overflow: 'auto'}}>
                <Form.Group style={{marginBottom:10}}>
                    <div style={{display: 'flex', justifyContent: 'flex-start'}}>
                    <Form.Label style={{paddingRight:30}}>Source</Form.Label>
                    {
                        nodes && nodes.map(node => 
                            <Form.Check type="radio" key={`source-${node.id}`} label={node.name} onChange={e => setTests({...tests, source: node})} style={{paddingRight:10}} checked={node===source} />
                        )
                    }
                    </div>
                </Form.Group>
                <Form.Group style={{marginTop: 10, marginBottom:10}}>
                    <div style={{display: 'flex', justifyContent: 'flex-start'}}>
                    <Form.Label style={{paddingRight:30}}>Target</Form.Label>
                    {
                        nodes && nodes.map(node => 
                            <Form.Check type="radio" key={`source-${node.id}`} label={node.name} onChange={e => setTests({...tests, target: node})} style={{paddingRight:10}} checked={node===target} />
                        )
                    }
                    </div>
                    <Form.Text className="text-muted">Remove all connections from/to source and target nodes</Form.Text>
                </Form.Group>
                <Form.Group style={{marginTop: 10, marginBottom:10}}>
                    <Form.Label>Repetitions</Form.Label>
                    <div style={{display: 'flex', justifyContent: 'flex-start'}}>
                        <Form.Control type='number' min={1} max={100} value={state.rounds} style={{width: 100, marginRight:20}} 
                            onChange={(e) => e.target.value && setState({...state, rounds: parseInt(e.target.value) })}/>
                        <Button variant="success" size="sm" onClick={start} disabled={state.stage==='ongoing' || !state.rounds || state.rounds > 100 || !source || !target} style={{marginRight:20}}>
                            Start</Button>
                        <Button variant="success" size="sm" onClick={stop} disabled={state.stage==='stopped'} style={{marginRight:20}}>
                            Stop</Button>
                        <Button variant="success" size="sm" onClick={clear} disabled={state.stage==='ongoing'} style={{marginRight:20}}>
                            Clear</Button>
                    </div>
                    <Form.Text className="text-muted">1 ~ 100</Form.Text>
                </Form.Group>
                <Form.Group style={{marginTop: 10, marginBottom:10, display: 'flex', justifyContent: 'flex-start'}}>
                    <div style={{width:'50%'}}>
                        <Form.Label>Logs</Form.Label>
                        <Form.Control as='textarea' rows={10} value={state.logs} style={{resize: 'none'}} readOnly />
                    </div>
                    <div style={{width:'50%'}}>
                        <Form.Label>Results</Form.Label>
                        <Form.Control as='textarea' rows={10} value={state.results} style={{resize: 'none'}} readOnly />
                    </div>
                </Form.Group>
            </Modal.Body>
        </Modal>
    )
}
export default Tests
