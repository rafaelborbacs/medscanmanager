import React from 'react'
import {Modal, Table} from 'react-bootstrap'

const formatDate = (d) => {
    d = new Date(d)
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getYear()-100} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
}

const formatTime = (d) => {
    d = new Date(d)
    return `${d.getHours().toString()}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
}

const Audit = (props) => {
    const { audit, setAudit } = props
    const { show, name, now, headers, items} = audit
    
    if(headers && headers.length > 0 && items && items.length > 0){
        headers['Max. Delay'] = Infinity
        headers['Avg. Delay'] = Infinity
        for(const item of items){
            let max, sum, n = 0
            let min = Infinity
            Object.keys(headers).forEach(key => {
                if(key !== 'name'){
                    let d = item[key]
                    if(d === '-')
                        d = Infinity
                    else
                        item[key] = formatDate(d)
                    n++
                    sum += d
                    max = d > max ? d : max
                    min = d < min ? d : min
                }
            })
            item['Max. Delay'] = max === Infinity ? '-' : formatTime(max - min)
            item['Avg. Delay'] = sum === Infinity ? '-' : formatDate(Math.floor(sum / n) - min)
        }
    }

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
