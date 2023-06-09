import React, {useState} from 'react'
import {ButtonGroup, Button, Dropdown, Form, Modal, Badge, Table} from 'react-bootstrap'
import ReactFlow, {Background, Controls, MarkerType} from 'reactflow'
import 'reactflow/dist/style.css'
import '../style/Net.css'

const randomPoint = () => Math.floor(20 + 300 * Math.random())

const blankNode = { name: '', host: '', apiport: 8080, apiprotocol: 'http', mirrored: false }

const Net = (props) => {
    const {net, updateNet, exitNet, dcmFetch} = props
    const [newNet, setNewNet] = useState({...net})
    const [showNet, setShowNet] = useState(false)
    const [mirror, setMirror] = useState({...net.mirror})
    const [showMirror, setShowMirror] = useState(false)
    const [node, setNode] = useState({...blankNode})
    const [showNode, setShowNode] = useState(false)
    const [showNewNode, setShowNewNode] = useState(false)
    const [files, setFiles] = useState([])
    const [showFiles, setShowFiles] = useState(false)
    
    const newNode = () => {
        setShowNewNode(true)
        setNode({...blankNode})
    }

    const submitNode = () => {
        setShowNewNode(false)
        if(node.mirrored){
            node.host = net.mirror.host
            node.apiport = net.mirror.apiport
            node.apiprotocol = net.mirror.apiprotocol
        }
        const urlAPI = `${node.apiprotocol}://${node.host}:${node.apiport}`
        if(net.nodes.find(n => n.id === urlAPI))
            return alert('node exists')
        dcmFetch(`${urlAPI}/config`, {}, (configs) => {
            if(!configs || !configs.name)
                return alert('ERROR')
            const newNode = {
                id: urlAPI,
                data: { label: configs.name },
                position: { x: randomPoint(), y: randomPoint() },
                connectable: true,
                ...node,
                ...configs
            }
            const nodes = [...net.nodes, newNode]
            updateNet({ ...net, nodes })
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
        const nodes = net.nodes.filter(n => n.id !== node.id)
        nodes.push({ ...node, position: { x: node.position.x + dX, y: node.position.y + dY } })
        updateNet({ ...net, nodes })
    }

    const openNode = (node) => {
        setNode({...node})
        setShowNode(true)
    }

    const updateFilesCount = () => {
        dcmFetch(`${node.apiprotocol}://${node.host}:${node.apiport}/file?count=1`, {}, count => {
            setNode({...node, filesCount: count ? count : 0})
            console.log(node)
        })
    }

    const startSCP = () => {
        dcmFetch(`${node.apiprotocol}://${node.host}:${node.apiport}/startscp`, {method: 'POST'}, () => setNode({...node, scp: true}))
    }

    const stopSCP = () => {
        dcmFetch(`${node.apiprotocol}://${node.host}:${node.apiport}/startscp`, {method: 'POST'}, () => setNode({...node, scp: false}))
    }

    const getFiles = () => {
        dcmFetch(`${node.apiprotocol}://${node.host}:${node.apiport}/file`, {}, files => {
            setFiles(files)
            setShowFiles(true)
        })
    }

    const openNet = () => {
        setNewNet({...net})
        setShowNet(true)
    }

    const submitNet = () => {
        for(const n of net.nodes){
            const body = { aetitle: newNet.aetitle, name: n.name }
            dcmFetch(`${n.apiprotocol}://${n.host}:${n.apiport}/config`, {method: 'PUT', body})
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
        const body = {
            aetitle: net.aetitle,
            name: node.name
        }
        dcmFetch(`${node.apiprotocol}://${node.host}:${node.apiport}/config`, { method: 'PUT', body }, () => {
            const nodes = net.nodes.filter(n => n.id !== node.id)
            nodes.push({ ...node, data: { label: node.name } })
            updateNet({ ...net, nodes })
        })
    }

    const onConnect = (params) => {
        console.log(params)
        const edge = {
            id: `${params.source}-${params.target}`,
            source: params.source,
            target: params.target,
            markerEnd: { type: MarkerType.ArrowClosed },
            animated: true,
            style: { stroke: 'blue' }
        }
        const edges = net.edges.filter(e => e.id !== edge.id)
        edges.push({ ...edge })
        updateNet({ ...net, edges })
        console.log(net)
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
                <Dropdown.Item onClick={()=>alert('sync')}>
                    <strong>Audit files</strong>
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
                        <Form.Control maxLength={16} value={newNet.aetitle}
                            onChange={(e) => setNewNet({...newNet, aetitle: e.target.value.replace(/[^0-9a-zA-Z]/g,'') })} />
                        <Form.Text className="text-muted">
                            {net.aetitle.length} / 16 * letters and numbers
                        </Form.Text>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer style={{display: 'flex', padding:0}}>
                    <div style={{width:'40%', textAlign:'left', margin: 0, padding:10}}>
                        <Button variant="success" size="sm" onClick={props.exportNet}>Export</Button>
                    </div>
                    <div style={{width:'60%', textAlign:'right', margin: 0, padding:10}}>
                        <Form.Text className="text-muted">Applies security key to all nodes </Form.Text>
                        <Button variant="success" size="sm" disabled={newNet.name.length === 0 || newNet.aetitle.length === 0} onClick={submitNet}>Ok</Button>
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
                            onChange={e => setNode({...node, mirrored: e.target.checked})} />
                        <Form.Text className="text-muted">
                            A mirror server must be previously configured
                        </Form.Text>
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
                            </>
                        )
                    }
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="success" size="sm"
                        disabled={(node.mirrored && node.name.length === 0) || (!node.mirrored && (node.host.length === 0 || node.apiport.toString().length < 2))} 
                        onClick={submitNode}>Add</Button>
                </Modal.Footer>
            </Modal>

            <Modal show={showNode} onHide={() => setShowNode(false)} dialogClassName="modal-node">
                <Modal.Header closeButton>
                    <Modal.Title>{node.name}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group style={{marginTop: 10, marginBottom:10}}>
                        <Form.Label>Name</Form.Label>
                        <div style={{display: 'flex', alignItems: 'flex-start'}}>
                            <Form.Control maxLength={16} value={node.name} size="sm" style={{width:'70%'}}
                                onChange={(e) => setNode({...node, name: e.target.value.replace(/[^0-9a-zA-Z]/g,'').toUpperCase() })} />
                            <Button variant="success" onClick={changeName} size="sm" style={{textAlign:'right'}}>Change</Button>
                        </div>
                        <Form.Text className="text-muted">
                                {node.name.length} / 16
                            </Form.Text>
                    </Form.Group>
                    <Form.Group>
                        <Form.Label>Rest API</Form.Label>
                        <h5>
                            <Badge bg="info">
                                {node.apiprotocol + '://' + node.host + ':' + node.apiport}
                            </Badge>
                        </h5>
                    </Form.Group>
                    <Form.Group>
                        <Form.Label>SCP</Form.Label>
                        <h5>
                            <Badge bg="info">
                                {net.aetitle + '@' + node.host + ':' + node.scpport}
                            </Badge>
                        </h5>
                        <Button variant="secondary" onClick={stopSCP} disabled={!node.scp} size="sm">Stop</Button>{' '}
                        <Button variant="secondary" onClick={startSCP} disabled={node.scp} size="sm">Start</Button>{' '}
                        <Form.Text style={{marginRight:20}}>
                            {node.scp ? 'running' : 'stoped'}
                        </Form.Text>{' '}
                        <Button variant="secondary" onClick={updateFilesCount} style={{marginRight:10}} size="sm">Files count</Button>{' '}
                        <Form.Label style={{marginRight:20}}>{node.filesCount === undefined ? '-' : node.filesCount}</Form.Label>
                        <Button variant="secondary" onClick={getFiles} size="sm">Files</Button>
                    </Form.Group>
                </Modal.Body>
            </Modal>

            <Modal show={showFiles} onHide={() => setShowFiles(false)} dialogClassName="modal-files">
                <Modal.Header closeButton>
                    <Modal.Title>{node.name + ' (' + files.length + ' files)'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Table size="sm" style={{fontSize: 'smaller'}} responsive={true} striped bordered hover>
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
                                    <td>{file.created}</td>
                                </tr>
                            )
                        }
                        </tbody>
                    </Table>
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
                                    <div style={{width: 200}}>
                                        <Form.Label>Mirror API Port</Form.Label>
                                        <Form.Control maxLength={5} value={mirror.apiport} size="sm" style={{width:100}}
                                            onChange={e => setMirror({...mirror, apiport: e.target.value.replace(/[^0-9]/g,'') })} />
                                        <Form.Text className="text-muted">
                                            {mirror.apiport.toString().length} / 5 * ex: 8080
                                        </Form.Text>
                                    </div>
                                    <div>
                                        <br/>
                                        <Form.Check style={{display:'inline-block', paddingRight:20}} label='http' name='apiprotocol' value='http' type='radio' 
                                            defaultChecked={mirror.apiprotocol === 'http'} onChange={(e) => setMirror({...mirror, apiprotocol: e.target.value })} />
                                        <Form.Check style={{display:'inline-block', paddingRight:20}} label='https' name='apiprotocol' value='https' type='radio' 
                                            defaultChecked={mirror.apiprotocol === 'https'} onChange={(e) => setMirror({...mirror, apiprotocol: e.target.value })} />
                                    </div>
                                </Form.Group>
                            </>
                        )
                    }
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="success" size="sm" disabled={mirror.host.length === 0 || mirror.apiport.toString().length < 2} 
                        onClick={submitMirror}>Save</Button>
                </Modal.Footer>
            </Modal>
            
            <ReactFlow id="flow" nodes={net.nodes} edges={net.edges} onNodeDragStart={onNodeDragStart} onNodeDragStop={onNodeDragStop} onConnect={onConnect}>
                <Background />
                <Controls />
            </ReactFlow>
        </>
    )
}
export default Net
