import React from 'react'
import {Modal, Table} from 'react-bootstrap'

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

const formatTime = (d) => {
    d = new Date(d)
    const h = d.getUTCHours().toString().padStart(2, '0')
    const m = d.getUTCMinutes().toString().padStart(2, '0')
    const s = d.getUTCSeconds().toString().padStart(2, '0')
    return (h === '00' ? '' : h + 'h ') + (m === '00' ? '' : m + 'm ') + s + 's'
}

const Audit = (props) => {
    const { audit, setAudit } = props
    let { show, name, now, headers, items} = audit

    let totalAvg = 0
    let totalMax = 0
    if(headers && items && items.length > 0){
        headers = [...headers]
        items = JSON.parse(JSON.stringify(items))
        for(const item of items){
            let max = 0, sum = 0, n = 0
            let min = 9999999999999
            for(const key of headers){
                let d = item[key]
                if(d === '-'){
                    n = null
                    break
                }
                n++
                sum += d
                max = d > max ? d : max
                min = d < min ? d : min
                //console.log('item',item,'key',key,'item[key]',item[key])
                item[key] = formatDate(item[key])
            }
            if(n == null){
                item['Max. Delay'] = '-'
                item['Avg. Delay'] = '-'
            }
            else {
                const maxDelay = max - min
                const avgDelay = 2 * (Math.floor(sum / n) - min)
                if(maxDelay > totalMax)
                    totalMax = maxDelay
                totalAvg += avgDelay / items.length
                item['Max. Delay'] = formatTime(maxDelay)
                item['Avg. Delay'] = formatTime(avgDelay)
            }
        }
        headers.push('Max. Delay', 'Avg. Delay')
    }

    let i = 0
    return (
        <Modal show={show} onHide={() => setAudit({ show: false })} dialogClassName="modal-files">
            <Modal.Header closeButton>
                <Modal.Title>Auditing {name} at {now}</Modal.Title>
            </Modal.Header>
            <Modal.Body style={{maxHeight: 500, overflow: 'auto'}}>
                <div style={{display: 'flex', justifyContent: 'flex-end'}}>
                    <span style={{margin:10}}>Total Max. Delay:</span>
                    <strong style={{margin:10}}>{formatTime(totalMax)}</strong>
                    <span style={{margin:10}}>Total Avg. Delay:</span>
                    <strong style={{margin:10}}>{formatTime(totalAvg)}</strong>
                </div>
                <Table size="sm" style={{fontSize: 'smaller'}} responsive={true} striped bordered hover>
                    <thead>
                        <tr>
                            <th key="thName">Name</th>
                            {
                                headers && headers.map(key => <th key={key}>{key}</th>)
                            }
                        </tr>
                    </thead>
                    <tbody>
                    {
                        items && items.map(item => 
                            <tr key={item.name+'tr'}>
                                <td key={item.name+'td'}>{item.name}</td>
                                {
                                    headers && headers.map(key => <td key={i++}>{item[key]}</td>)
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
