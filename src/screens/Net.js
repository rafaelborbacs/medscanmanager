import React, {useState, useEffect} from 'react'
import {ButtonGroup, Button, Dropdown, Form, Modal, Badge, Table} from 'react-bootstrap'
import ReactFlow, {Background, Controls, MarkerType} from 'reactflow'
import Audit from '../components/Audit'
import Tests from '../components/Tests'
import 'reactflow/dist/style.css'
import '../style/Net.css'

const randomAETitle = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let aetitle = ''
    for (let i = 0; i < 16; i++) {
        const randomIndex = Math.floor(Math.random() * chars.length)
        aetitle += chars.charAt(randomIndex)
    }
    return aetitle
}
const randomPoint = () => Math.floor(20 + 300 * Math.random())
const formatDate = (d) => {
    d = new Date(d)
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getYear()-100} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
}
const blankNode = { name: '', host: '', apiport: 8080, apiprotocol: 'http', scpport: 6000, mirrored: false }
let edges = []
const Net = (props) => {
    const {net, updateNet, exportNet, exitNet, dcmFetch, setModal, setAlert} = props
    const [newNet, setNewNet] = useState({...net})
    const [showNet, setShowNet] = useState(false)
    const [mirror, setMirror] = useState({...net.mirror})
    const [showMirror, setShowMirror] = useState(false)
    const [node, setNode] = useState({...blankNode})
    const [showNode, setShowNode] = useState(false)
    const [showNewNode, setShowNewNode] = useState(false)
    const [files, setFiles] = useState(false)
    const [scpFiles, setSCPFiles] = useState(false)
    const [audit, setAudit] = useState({ show: false })
    const [tests, setTests] = useState({ show: false, net })

    useEffect(() => {
        const fit = document.querySelector('button[title="fit view"]')
        if(fit) setTimeout(() => { fit.click() }, 1000)
    }, [net])
    
    const newNode = () => {
        setShowNewNode(true)
        setNode({...blankNode})
    }
    
    const submitNode = () => {
        setShowNewNode(false)
        if(node.mirrored){
            node.apiprotocol = mirror.apiprotocol
            node.host = mirror.host
            node.apiport = mirror.apiport
            node.scpport = mirror.scpport
        }
        else if(net.nodes.find(n => n.host === node.host && n.apiport === node.apiport))
            return setAlert(`Node running on ${node.host}:${node.apiport} already exists`)
        const url = `${node.apiprotocol}://${node.host}:${node.apiport}`
        dcmFetch(`${url}/config`, {name: node.name}, configs => {
            if(!configs || !configs.name)
                return setAlert(`Can't access ${url}`)
            const name = configs.name
            if(net.nodes.find(n => n.name === name))
                return setAlert(`Node ${name} already exists`)
            dcmFetch(`${url}/node`, {method: 'DELETE', name, body: {}})
            Object.keys(configs).forEach(key => node[key] = node[key] ? node[key] : configs[key])
            node.name = name
            node.id = name
            node.data = { label: name }
            node.position = { x: randomPoint(), y: randomPoint() }
            node.connectable = true
            node.nodes = []
            updateNet({ ...net, nodes: [...net.nodes, node] })
        })
    }

    let x, y = 0
    const onNodeDragStart = (event, node) => {
        x = event.x
        y = event.y
    }

    const onNodeDragStop = (event, node) => {
        event.preventDefault()
        const dX = Math.floor((event.x - x) / 10)
        const dY = Math.floor((event.y - y) / 10)
        if(dX === 0 && dY === 0)
            return openNode(node)
        const myNode = net.nodes.find(n => n.id === node.id)
        const nodes = net.nodes.filter(n => n.id !== node.id)
        nodes.push({ ...myNode, position: { x: node.position.x + dX, y: node.position.y + dY } })
        updateNet({ ...net, nodes })
    }

    const openNode = (node) => {
        setNode(net.nodes.find(n => n.id === node.id))
        setShowNode(true)
    }

    const filesCountSCP = () => {
        dcmFetch(`${node.apiprotocol}://${node.host}:${node.apiport}/scpfilescount`, {name: node.name}, count => {
            node.filesCountSCP = count ? count : 0
            updateNet({ ...net })
        })
    }

    const filesCountMetadata = () => {
        dcmFetch(`${node.apiprotocol}://${node.host}:${node.apiport}/filecount`, {name: node.name}, count => {
            node.filesCountMetadata = count ? count : 0
            updateNet({ ...net })
        })
    }

    const startSCP = () => {
        dcmFetch(`${node.apiprotocol}://${node.host}:${node.apiport}/startscp`, {method: 'POST', name: node.name}, () => {
            node.scp = true
            updateNet({ ...net })
        })
    }

    const stopSCP = () => {
        dcmFetch(`${node.apiprotocol}://${node.host}:${node.apiport}/startscp`, {method: 'POST', name: node.name}, () => {
            node.scp = false
            updateNet({ ...net })
        })
    }

    const cleanSCP = () => {
        setModal({
            show: true,
            title: 'Clean this SCP?',
            text: 'Removes all DCM files but keeps the metadata',
            handleOk: () => dcmFetch(`${node.apiprotocol}://${node.host}:${node.apiport}/cleanscp`, {method: 'DELETE', name: node.name}, () => {
                node.filesCountSCP = undefined
                setModal({show: false})
            }),
            handleCancel: () => setModal({show: false})
        })
    }

    const cleanSCPMetadata = () => {
        setModal({
            show: true,
            title: 'Clean DCM metadata?',
            text: 'If DCM files are still present in the SCP, metadata will be recollected',
            handleOk: () => dcmFetch(`${node.apiprotocol}://${node.host}:${node.apiport}/file`, {method: 'DELETE', name: node.name, body: {names:[]}}, () => {
                node.filesCountMetadata = undefined
                setModal({show: false})
            }),
            handleCancel: () => setModal({show:false})
        })
    }

    const getSCPFiles = () => {
        dcmFetch(`${node.apiprotocol}://${node.host}:${node.apiport}/scpfiles`, {name: node.name}, files => setSCPFiles(files))
    }
    
    const getMetadataFiles = () => {
        dcmFetch(`${node.apiprotocol}://${node.host}:${node.apiport}/file`, {name: node.name}, files => setFiles(files))
    }

    const openNet = () => {
        setNewNet({...net})
        setShowNet(true)
    }

    const submitNet = () => {
        for(const n of net.nodes){
            const body = { aetitle: newNet.aetitle, name: n.name }
            dcmFetch(`${n.apiprotocol}://${n.host}:${n.apiport}/config`, {method: 'PUT', name: n.name, body})
        }
        updateNet({ ...net, ...newNet })
        setShowNet(false)
    }

    const openMirror = () => {
        setMirror({...net.mirror})
        setShowMirror(true)
    }

    const submitMirror = () => {
        updateNet({ ...net, mirror })
        setShowMirror(false)
    }

    const changeName = () => {
        if(edges.find(e => e.source === node.id || e.target === node.id))
            return setModal({
                show: true,
                title: 'This node is connected',
                text: 'Remove all connections before changing the name',
                handleOk: () => setModal({show: false})
            })
        const name = node.name
        const body = { aetitle: net.aetitle, name }
        dcmFetch(`${node.apiprotocol}://${node.host}:${node.apiport}/config`, {method: 'PUT', name: node.id, body}, () => {
            const nodes = net.nodes.filter(n => n.id !== node.id)
            nodes.push({ ...node, name, id: name, data: { label: name } })
            updateNet({ ...net, nodes })
        })
    }

    const onConnect = (params) => {
        const source = net.nodes.find(n => n.id === params.source)
        const target = net.nodes.find(n => n.id === params.target)
        const body = {
            host: target.host,
            scpport: target.scpport,
            apiport: target.apiport,
            name: target.name,
            apiprotocol: target.apiprotocol
        }
        dcmFetch(`${source.apiprotocol}://${source.host}:${source.apiport}/node`, {method: 'POST', name: source.name, body}, data => {
            if(data.msg === 'ok'){
                source.nodes = source.nodes.filter(n => n.id !== target.id)
                source.nodes.push({ id: target.id })
                updateNet({ ...net })
            }
            else setAlert(data.msg)
        })
    }

    const onEdgeClick = (event, edge) => {
        setModal({
            show: true, 
            title: 'Remove connection?', 
            text: edge.id, 
            handleOk: () => {
                const source = net.nodes.find(n => n.id === edge.source)
                const body = { name: edge.target }
                dcmFetch(`${source.apiprotocol}://${source.host}:${source.apiport}/node`, {method: 'DELETE', name: source.name, body}, () => {
                    source.nodes = source.nodes.filter(n => n.id !== edge.target)
                    updateNet({ ...net })
                })
            },
            handleCancel: () => setModal({show: false})
        })
    }

    const auditNetwork = () => {
        let nodes = JSON.parse(JSON.stringify(net.nodes))
        setModal({
            show: true, 
            title: 'Network Auditing', 
            text: (
                <div style={{textAlign:'left'}}>
                    {
                        nodes && nodes.map(node => 
                            <Form.Check key={`audit-${node.id}`} label={node.name} onChange={e => node.checked = e.target.checked} />
                        )
                    }
                </div>
            ),
            handleOk: () => {
                nodes = nodes.filter(node => node.checked)
                const d = new Date()
                const now = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
                const items = []
                const headers = []
                nodes.forEach(node => headers.push(node.name))
                nodes.forEach(node => {
                    dcmFetch(`${node.apiprotocol}://${node.host}:${node.apiport}/file`, {name: node.name}, files => {
                        if(files){
                            for(const file of files){
                                const { name, created } = file
                                const found = items.find(i => i.name === name)
                                if(found)
                                    found[node.name] = created
                                else {
                                    const auditItem = { name: file.name }
                                    headers.forEach(header => auditItem[header] = '-')
                                    auditItem[node.name] = created
                                    items.push(auditItem)
                                }
                            }
                            setAudit({...audit, show: true, name: net.name, now, headers, items: [...items]})
                        }
                    })
                })
                setModal({show: false})
            },
            handleCancel: () => setModal({show: false})
        })
    }

    const testMirrorAPI = () => {
        dcmFetch(`${mirror.apiprotocol}://${mirror.host}:${mirror.apiport}/status`, {name: 'mirror'}, data => {
            const text = data && data.msg === 'ok' ? 'Ok' : 'Mirror API is unreachable'
            setModal({
                show: true, 
                title: 'Testing Mirror API...', 
                text, 
                handleOk: () => setModal({show: false})
            })
        })
    }

    const removeNode = () => {
        setModal({
            show: true, 
            title: `Remove node ${node.name}?`,
            text: 'Also removes its connections', 
            handleOk: () => {
                setShowNode(false)
                dcmFetch(`${node.apiprotocol}://${node.host}:${node.apiport}/node`, {method: 'DELETE', name: node.name, body:{}})
                const nodes = net.nodes.filter(n => n.id !== node.id)
                for(const n of nodes){
                    dcmFetch(`${n.apiprotocol}://${n.host}:${n.apiport}/node`, {method: 'DELETE', name: n.name, body: {name: node.name}})
                    n.nodes = n.nodes.filter(n => n.id !== node.id)
                }
                updateNet({ ...net, nodes })
            },
            handleCancel: () => setModal({show: false})
        })
    }

    const reliabilityTests = () => {
        setTests({...tests, net, show: true })
    }

    const formEdges = () => {
        edges = []
        net.nodes.forEach(source => {
            if(source.nodes)
                source.nodes.forEach(target => {
                    edges.push({
                        id: `${source.id} => ${target.id}`,
                        source: source.id,
                        target: target.id,
                        markerEnd: { type: MarkerType.ArrowClosed },
                        animated: true,
                        style: { stroke: target.mirrored ? 'red' : 'blue' },
                        label: target.mirrored ? 'Mirror' : undefined
                    })
                })
        })
        return edges
    }

    return (
        <>
            <Dropdown as={ButtonGroup}>
            <Button onClick={openNet}>{net.name}</Button>
            <Dropdown.Toggle split/>
            <Dropdown.Menu>
                <Dropdown.Item onClick={newNode}>
                    <strong>Add node</strong>
                </Dropdown.Item>
                <Dropdown.Item onClick={openMirror}>
                    <strong>Mirror</strong>
                </Dropdown.Item>
                <Dropdown.Item onClick={auditNetwork}>
                    <strong>Audit network</strong>
                </Dropdown.Item>
                <Dropdown.Item onClick={reliabilityTests}>
                    <strong>Reliability tests</strong>
                </Dropdown.Item>
                <Dropdown.Item onClick={exitNet}>
                    <strong>Exit</strong>
                </Dropdown.Item>
            </Dropdown.Menu>
            </Dropdown>

            <Modal show={showNet} onHide={() => setShowNet(false)} dialogClassName="modal-net">
                <Modal.Header closeButton>
                    <Modal.Title>DCM Network</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group style={{marginTop: 10, marginBottom:10}}>
                        <Form.Label>Name</Form.Label>
                        <Form.Control maxLength={24} value={newNet.name} onChange={(e) => setNewNet({...newNet, name: e.target.value })} />
                        <Form.Text className="text-muted">
                            {newNet.name.length} / 24
                        </Form.Text>
                    </Form.Group>
                    <Form.Group style={{marginTop: 10, marginBottom:10}}>
                        <Form.Label>Security Key</Form.Label>
                        <div style={{display: 'flex', alignItems: 'flex-start'}}>
                            <Form.Control maxLength={16} value={newNet.aetitle} size="sm" style={{width:300}}
                            onChange={(e) => setNewNet({...newNet, aetitle: e.target.value.replace(/[^0-9a-zA-Z]/g,'') })} />
                            <Button variant="success" onClick={() => setNewNet({...newNet, aetitle: randomAETitle()})} 
                                size="sm" style={{textAlign:'right'}}>Random</Button>
                        </div>
                        <Form.Text className="text-muted">
                            {net.aetitle.length} / 16 * letters and numbers
                        </Form.Text>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer style={{display: 'flex', padding:0}}>
                    <div style={{width:'40%', textAlign:'left', margin: 0, padding:10}}>
                        <Button variant="outline-success" size="sm" onClick={exportNet}>Export</Button>
                    </div>
                    <div style={{width:'60%', textAlign:'right', margin: 0, padding:10}}>
                        <Button variant="success" size="sm" disabled={newNet.name.length === 0 || newNet.aetitle.length === 0} onClick={submitNet}>Change</Button>
                    </div>
                </Modal.Footer>
            </Modal>

            <Modal show={showNewNode} onHide={() => setShowNewNode(false)} dialogClassName="modal-new">
                <Modal.Header closeButton>
                    <Modal.Title>Add Node</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group style={{marginTop: 10, marginBottom:10}}>
                        <Form.Check type="switch" label="Lacking external IP address (use mirror)" id="mirrored" defaultChecked={node.mirrored}
                            onChange={e => setNode({...node, mirrored: e.target.checked})} disabled={!net.mirror.enabled} />
                        {
                            !net.mirror.enabled && (
                                <span className="red-text">
                                    Mirror server must be enabled to use this feature
                                </span>
                            )
                        }
                    </Form.Group>
                    {
                        node.mirrored && (
                            <>
                                <Form.Group style={{marginTop: 10, marginBottom:10}}>
                                    <Form.Label>Name</Form.Label>
                                    <Form.Control maxLength={16} value={node.name} 
                                        onChange={(e) => setNode({...node, name: e.target.value.replace(/[^0-9a-zA-Z]/g,'').toUpperCase() })} />
                                    <Form.Text className="text-muted">
                                        {node.name.length} / 16
                                    </Form.Text>
                                </Form.Group>
                            </>
                        )
                    }
                    {
                        !node.mirrored && (
                            <>
                                <Form.Group style={{marginTop: 10, marginBottom:10}}>
                                    <Form.Label>Host</Form.Label>
                                    <Form.Control maxLength={64} value={node.host} size="sm"
                                        onChange={(e) => setNode({...node, host: e.target.value })} />
                                    <Form.Text className="text-muted">
                                        {node.host.length} / 64 * ex: 183.8.53.53 or domain.company.com
                                    </Form.Text>
                                </Form.Group>
                                <Form.Group style={{marginTop: 10, marginBottom:10, display: 'flex', alignItems: 'flex-start'}}>
                                    <div style={{width: 200}}>
                                        <Form.Label>API Port</Form.Label>
                                        <Form.Control maxLength={5} value={node.apiport} size="sm" style={{width:100}}
                                            onChange={(e) => setNode({...node, apiport: e.target.value.replace(/[^0-9]/g,'') })} />
                                        <Form.Text className="text-muted">
                                            {node.apiport.toString().length} / 5 * ex: 8080
                                        </Form.Text>
                                    </div>
                                    <div>
                                        <Form.Label></Form.Label><br/>
                                        <Form.Check style={{display:'inline-block', paddingRight:20}} label='http' name='apiprotocol' value='http' type='radio' 
                                            defaultChecked={node.apiprotocol === 'http'} onChange={(e) => setNode({...node, apiprotocol: e.target.value })} />
                                        <Form.Check style={{display:'inline-block', paddingRight:20}} label='https' name='apiprotocol' value='https' type='radio' 
                                            defaultChecked={node.apiprotocol === 'https'} onChange={(e) => setNode({...node, apiprotocol: e.target.value })} />
                                    </div>
                                </Form.Group>
                                <Form.Group style={{marginTop: 10, marginBottom:10}}>
                                    <Form.Label>SCP Port</Form.Label>
                                    <Form.Control maxLength={5} value={node.scpport} size="sm" style={{width:100}}
                                        onChange={(e) => setNode({...node, scpport: e.target.value.replace(/[^0-9]/g,'') })} />
                                    <Form.Text className="text-muted">
                                        {node.scpport.toString().length} / 5 * ex: 6000
                                    </Form.Text>
                                </Form.Group>
                            </>
                        )
                    }
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="success" size="sm"
                        disabled={(node.mirrored && node.name.length === 0) || (!node.mirrored && (node.host.length === 0 || node.apiport.toString().length < 2 || node.scpport.toString().length < 2))} 
                        onClick={submitNode}>Add</Button>
                </Modal.Footer>
            </Modal>

            <Modal show={showNode} onHide={() => setShowNode(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>{node.name}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group style={{marginTop: 10, marginBottom:10}}>
                        <Form.Label>Name</Form.Label>
                        <div style={{display: 'flex', alignItems: 'flex-start'}}>
                            <Form.Control maxLength={16} value={node.name} size="sm" style={{width:300}}
                                onChange={(e) => setNode({...node, name: e.target.value.replace(/[^0-9a-zA-Z]/g,'').toUpperCase() })} />
                            <Button variant="success" onClick={changeName} size="sm" style={{textAlign:'right'}}
                                disabled={!node.name || net.nodes.find(n => n.name === node.name)}>
                                Change
                            </Button>
                        </div>
                        <Form.Text className="text-muted">
                            {node.name.length} / 16
                        </Form.Text>
                    </Form.Group>
                    <Form.Group>
                        <Form.Label>Rest API</Form.Label>
                        <h5>
                            <Badge bg="info">{node.apiprotocol + '://' + node.host + ':' + node.apiport}</Badge>
                        </h5>
                    </Form.Group>
                    <Form.Group>
                        <Form.Label>SCP</Form.Label>
                        <h5>
                            <Badge bg="info">{net.aetitle + '@' + node.host + ':' + node.scpport}</Badge>
                        </h5>
                        <Button variant="secondary" onClick={stopSCP} disabled={!node.scp} size="sm">Stop</Button>{' '}
                        <Button variant="secondary" onClick={startSCP} disabled={node.scp} size="sm">Start</Button>{' '}
                        <Form.Text style={{marginRight:20}}>{node.scp ? 'running' : 'stoped'}</Form.Text>{' '}
                        <Button variant="secondary" onClick={filesCountSCP} style={{marginRight:10}} size="sm">Count files</Button>{' '}
                        <Form.Label style={{marginRight:20}}>{node.filesCountSCP === undefined ? '-' : node.filesCountSCP}</Form.Label>
                        <Button variant="secondary" onClick={getSCPFiles} size="sm">Files</Button>{' '}
                        <Button variant="secondary" onClick={cleanSCP} size="sm">Clean SCP</Button>
                    </Form.Group>
                    <Form.Group>
                        <Form.Label style={{marginBottom:10, marginTop:10}}>DCM metadata</Form.Label><br/>
                        <Button variant="secondary" onClick={filesCountMetadata} style={{marginRight:10}} size="sm">Count files</Button>{' '}
                        <Form.Label style={{marginRight:20}}>{node.filesCountMetadata === undefined ? '-' : node.filesCountMetadata}</Form.Label>
                        <Button variant="secondary" onClick={getMetadataFiles} size="sm">Files</Button>{' '}
                        <Button variant="secondary" onClick={cleanSCPMetadata} size="sm">Clean metadata</Button>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="danger" size="sm" onClick={removeNode}>Remove</Button>
                </Modal.Footer>
            </Modal>

            <Modal show={files} onHide={() => setFiles(false)} dialogClassName="modal-files">
                <Modal.Header closeButton>
                    <Modal.Title>{node.name + ' (' + (files ? files.length : 0) + ' files)'}</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{maxHeight: 500, overflow: 'auto'}}>
                    <Table size="sm" responsive={true} striped bordered hover style={{fontSize: 'smaller'}}>
                        <thead>
                            <tr>
                                <th>SOP Instance UID</th>
                                <th>SOP Class UID</th>
                                <th>Patient ID</th>
                                <th>Modality</th>
                                <th>Study Date</th>
                                <th>Receive Date</th>
                            </tr>
                        </thead>
                        <tbody>
                        {
                            files && files.map(file => 
                                <tr key={file._id}>
                                    <td>{file.metadicom.sopinstanceuid}</td>
                                    <td>{file.metadicom.sopclassuid}</td>
                                    <td>{file.metadicom.patientid}</td>
                                    <td>{file.metadicom.modality}</td>
                                    <td>{file.metadicom.studydate}</td>
                                    <td>{formatDate(file.created)}</td>
                                </tr>
                            )
                        }
                        </tbody>
                    </Table>
                </Modal.Body>
            </Modal>
            
            <Modal show={scpFiles} onHide={() => setSCPFiles(false)} dialogClassName="modal-scp-files">
                <Modal.Header closeButton>
                    <Modal.Title>{node.name + ' (' + (scpFiles ? scpFiles.length : 0) + ' files)'}</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{maxHeight: 500, overflow: 'auto'}}>
                    {
                        scpFiles && scpFiles.map(file => <Badge bg="light" text="dark" key={file}>{file}</Badge>)
                    }
                </Modal.Body>
            </Modal>

            <Modal show={showMirror} onHide={() => setShowMirror(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Mirror</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group style={{marginTop: 10, marginBottom:10}}>
                        <Form.Check type="switch" label="Enable Mirror Server" id="enabled" defaultChecked={mirror.enabled}
                            onChange={e => setMirror({...mirror, enabled: e.target.checked})} />
                    </Form.Group>
                    {
                        mirror.enabled && (
                            <>
                                <Form.Group style={{marginTop: 10, marginBottom:10}}>
                                    <Form.Label>Host</Form.Label>
                                    <Form.Control maxLength={64} value={mirror.host} size="sm"
                                        onChange={e => setMirror({...mirror, host: e.target.value })} />
                                    <Form.Text className="text-muted">
                                        {mirror.host.length} / 64 * ex: 183.8.53.53 or domain.company.com
                                    </Form.Text>
                                </Form.Group>
                                <Form.Group style={{marginTop: 10, marginBottom:10, display: 'flex', alignItems: 'flex-start'}}>
                                    <div>
                                        <Form.Label>Mirror API Port</Form.Label>
                                        <Form.Control maxLength={5} value={mirror.apiport} size="sm" style={{width:100}}
                                            onChange={e => setMirror({...mirror, apiport: e.target.value.replace(/[^0-9]/g,'') })} />
                                        <Form.Text className="text-muted">
                                            {mirror.apiport.toString().length} / 5 * ex: 8383
                                        </Form.Text>
                                    </div>
                                    <div style={{margin: 'auto'}}>
                                        <Form.Check style={{display:'inline-block', paddingRight:20}} label='http' name='apiprotocol' value='http' type='radio' 
                                            defaultChecked={mirror.apiprotocol === 'http'} onChange={(e) => setMirror({...mirror, apiprotocol: e.target.value })} />
                                        <Form.Check style={{display:'inline-block', paddingRight:20}} label='https' name='apiprotocol' value='https' type='radio' 
                                            defaultChecked={mirror.apiprotocol === 'https'} onChange={(e) => setMirror({...mirror, apiprotocol: e.target.value })} />
                                    </div>
                                    <Button variant="secondary" onClick={testMirrorAPI} size="sm" style={{margin: 'auto'}} disabled={mirror.apiport.toString().length < 2}>Test API</Button>
                                </Form.Group>
                                <Form.Group style={{marginTop: 10, marginBottom:10, display: 'flex', alignItems: 'flex-start'}}>
                                    <div>
                                        <Form.Label>Mirror SCP Port</Form.Label>
                                        <Form.Control maxLength={5} value={mirror.scpport} size="sm" style={{width:100}}
                                            onChange={e => setMirror({...mirror, scpport: e.target.value.replace(/[^0-9]/g,'') })} />
                                        <Form.Text className="text-muted">
                                            {mirror.scpport.toString().length} / 5 * ex: 6060
                                        </Form.Text>
                                    </div>
                                    <Badge style={{margin:'auto'}} bg="info">{mirror.host + ':' + mirror.scpport}</Badge>
                                </Form.Group>
                            </>
                        )
                    }
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="success" size="sm" disabled={mirror.host.length === 0 || mirror.apiport.toString().length < 2 || mirror.scpport.toString().length < 2} 
                        onClick={submitMirror}>Change</Button>
                </Modal.Footer>
            </Modal>
            <Audit audit={audit} setAudit={setAudit} />
            <Tests tests={tests} setTests={setTests} dcmFetch={dcmFetch} />
            <ReactFlow id="flow" nodes={net.nodes} edges={formEdges()} onNodeDragStart={onNodeDragStart} onNodeDragStop={onNodeDragStop} 
                onConnect={onConnect} onEdgeClick={onEdgeClick} fitView>
                <Background />
                <Controls />
            </ReactFlow>
        </>
    )
}
export default Net
