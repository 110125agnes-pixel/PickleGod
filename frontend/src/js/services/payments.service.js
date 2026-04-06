import axios from 'axios'

export function getPayments(){
  return axios.get('/api/payments').then(r=> r.data)
}

export function createPayment(payload){
  return axios.post('/api/payments', payload).then(r=> r.data)
}

export function deletePayment(id){
  return axios.delete(`/api/payments/${id}`).then(r=> r.data)
}

export function updatePaymentStatus(id, status){
  return axios.patch(`/api/payments/${id}/status`, { status }).then(r=> r.data)
}
