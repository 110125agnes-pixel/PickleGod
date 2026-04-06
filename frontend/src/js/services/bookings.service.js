import axios from 'axios'

export function getBookings(){
  return axios.get('/api/bookings').then(r=> r.data)
}

export function createBooking(payload){
  return axios.post('/api/bookings', payload).then(r=> r.data)
}

export function deleteBooking(id){
  return axios.delete(`/api/bookings/${id}`).then(r=> r.data)
}
