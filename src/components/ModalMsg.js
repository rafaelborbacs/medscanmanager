import React from 'react'
import Button from 'react-bootstrap/Button'
import Modal from 'react-bootstrap/Modal'

const ModalMsg = (props) => (
    <Modal show={props.modal.show} centered>
        <Modal.Header>
            <Modal.Title>{props.modal.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{textAlign:'center', fontSize:'larger'}}>{props.modal.text}</Modal.Body>
        <Modal.Footer style={{display: 'flex', padding:0}}>
            <div style={{width:'50%', textAlign:'left', margin: 0, padding:10}}>
            {   
                props.modal.handleCancel &&
                (<Button variant="outline-success" onClick={props.modal.handleCancel} size="sm">Cancel</Button>)
            }    
            </div>
            <div style={{width:'50%', textAlign:'right', margin: 0, padding:10}}>
                <Button variant="outline-success" onClick={props.modal.handleOk} size="sm">Ok</Button>
            </div>
        </Modal.Footer>
    </Modal>
)
export default ModalMsg
