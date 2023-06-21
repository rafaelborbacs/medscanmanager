import React, {useState} from 'react'
import {Button, Form, Modal, Alert} from 'react-bootstrap'
import 'bootstrap/dist/css/bootstrap.min.css'
import '../style/Welcome.css'

const randomAETitle = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let aetitle = ''
    for (let i = 0; i < 16; i++) {
        const randomIndex = Math.floor(Math.random() * chars.length)
        aetitle += chars.charAt(randomIndex)
    }
    return aetitle
}

const blankNet = { name: '', nodes: [], mirror: { enabled: false, host: '', apiport: 8383, apiprotocol: 'http', scpport: 6060 } }
const Welcome = (props) => {
    const [state, setState] = useState('welcome')
    const [net, setNet] = useState({...blankNet, aetitle: randomAETitle()})

    const newNet = () => {
        setState('new')
        setNet({...blankNet, aetitle: randomAETitle()})
    }

    const fileChange = (event) => {
        const file = event.target.files[0]
        if(file){
            const reader = new FileReader()
            reader.onload = (e) => {
                try {
                    const contents = e.target.result
                    const json = JSON.parse(contents)
                    setState('welcome')
                    props.updateNet(json)
                } catch(err){
                    props.setModal({ show: true, title: 'Error', text: <Alert variant="danger">Malformed file</Alert>, handleOk: () => props.setModal(false) })
                }
            }
            reader.readAsText(file)
        }
        document.getElementById('fileInput').value = null
    }

    const openNet = () => document.getElementById('fileInput').click()

    const submitNewNet = () => {
        setState('welcome')
        props.updateNet(net)
    }

    return (
        <>
            <input type="file" id="fileInput" accept=".json" onChange={fileChange} hidden={true} />
            <Modal show={state === 'welcome'} dialogClassName="modal-welcome" centered>
                <Modal.Header>
                    <Modal.Title>DCM Network Manager</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group>
                            <Button variant="outline-success" onClick={newNet} style={{width: '100%', marginBottom: 10}}>
                                Create New Network
                            </Button>
                        </Form.Group>
                        <Form.Group>
                            <Button variant="outline-success" onClick={openNet} style={{width: '100%'}}>
                                Open Existing Network
                            </Button>
                        </Form.Group>
                    </Form>
                </Modal.Body>
            </Modal>

            <Modal show={state === 'new'} onHide={() => setState('welcome')} dialogClassName="modal-new">
                <Modal.Header closeButton>
                    <Modal.Title>New Network</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group style={{marginTop: 10, marginBottom:10}}>
                            <Form.Label>Name</Form.Label>
                            <Form.Control maxLength={24} defaultValue={net.name} onChange={(e) => setNet({...net, name: e.target.value })} />
                            <Form.Text className="text-muted">
                                {net.name.length} / 24
                            </Form.Text>
                        </Form.Group>
                        <Form.Group style={{marginTop: 10, marginBottom:10}}>
                            <Form.Label>Security Key</Form.Label>
                            <Form.Control maxLength={16} defaultValue={net.aetitle}
                                onChange={(e) => setNet({...net, aetitle: e.target.value.replace(/[^0-9a-zA-Z]/g,'') })} />
                            <Form.Text className="text-muted">
                                {net.aetitle.length} / 16 * letters and numbers
                            </Form.Text>
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="success" disabled={net.name.length === 0 || net.aetitle.length === 0} onClick={submitNewNet}>Create</Button>
                </Modal.Footer>
            </Modal>            
        </>
    )
}
export default Welcome
