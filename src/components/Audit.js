import React from 'react'
import {Modal, Table} from 'react-bootstrap'

const Audit = (props) => {
    const { audit, setAudit } = props
    const { show, name, now, headers, items} = audit
    
    let i = 0    
    return (
        <Modal show={show} onHide={() => setAudit({ show: false })} dialogClassName="modal-files">
            <Modal.Header closeButton>
                <Modal.Title>Auditing {name} at {now}</Modal.Title>
            </Modal.Header>
            <Modal.Body style={{maxHeight: 500, overflow: 'auto'}}>
                <Table size="sm" style={{fontSize: 'smaller'}} responsive={true} striped bordered hover>
                    <thead>
                        <tr>
                            {
                                headers && Object.keys(headers).map(key => <th key={key}>{key}</th>)
                            }
                        </tr>
                    </thead>
                    <tbody>
                    {
                        items && items.map(item => 
                            <tr key={++i}>
                                {
                                    headers && Object.keys(headers).map(key => <td key={i++}>{item[key]}</td>)
                                }
                            </tr>
                        )
                    }
                    </tbody>
                </Table>
            </Modal.Body>
        </Modal>
    )
}
export default Audit
