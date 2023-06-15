import ls from 'local-storage'
import {useState} from 'react'
import ReactDOM from 'react-dom/client'
import {Modal, Spinner, Container, Alert} from 'react-bootstrap'
import Net from './screens/Net'
import Welcome from './screens/Welcome'
import ModalMsg from './components/ModalMsg'
import './style/index.css'

const Medscan = (props) => {
    const [net, setNet] = useState(ls.get('net'))
    const [screen, setScreen] = useState(net ? 'Net' : 'Welcome')
    const [loading, setLoadings] = useState(0)
    const [modal, setModal] = useState({ show: false })
    const [alert, setAlert] = useState(false)

    const setLoading = (boo) => setLoadings(Math.max(loading + (boo ? 1 : -1), 0))

    const dcmFetch = (url, options, callback) => {
        setLoading(true)
        options.headers = {...options.headers, 'content-type': 'application/json', 'authorization': `Bearer ${net.aetitle}`}
        if(options.body && typeof options.body === 'object')
            options.body = JSON.stringify(options.body)
        fetch(url, options)
        .then(response => {
            setLoading(false)
            if(response.status !== 200){
                console.log(`fetch failed: ${response.status}`)
                if(callback) callback(false)
            }
            return response.json()
        })
        .then(data => {
            if(callback) callback(data)
        })
        .catch(error => {
            console.log(error)
            setLoading(false)
            if(callback) callback(false)
        })
    }

    const updateNet = (net) => {
        setModal(false)
        ls.clear()
        ls.set('net', net)
        setNet(net)
        setScreen('Net')
    }
    
    const openNet = () => {

    }
    
    const exitNet = () => {
        setModal(false)
        ls.clear()
        setNet(false)
        setScreen('Welcome')
    }
    
    const exportNet = () => {
        const blob = new Blob([JSON.stringify(net)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${net.name}-network.json`
        link.click()
        URL.revokeObjectURL(url)
    }

    const screens = {
        Welcome: <Welcome net={net} updateNet={updateNet} openNet={openNet} setModal={setModal} />,
        Net: <Net net={net} updateNet={updateNet} exitNet={exitNet} exportNet={exportNet} dcmFetch={dcmFetch} setModal={setModal} setAlert={setAlert} />
    }
    
    return (
        <div id="base">
            <ModalMsg modal={modal} />
            <Modal show={loading > 0} dialogClassName="modal-loading" centered>
                <Modal.Body>
                    <Spinner animation="border" />
                </Modal.Body>
            </Modal>
            {
                alert && 
                    (
                        <Alert variant="danger" onClose={() => setAlert(false)} dismissible>
                            <Alert.Heading>{alert}</Alert.Heading>
                        </Alert>
                    )
            }
            <Container id="container">
                {screens[screen]}
            </Container>
        </div>
    )
}
const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(<Medscan />)
