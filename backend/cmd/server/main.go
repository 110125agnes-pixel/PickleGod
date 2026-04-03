package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
)

type Court struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type Booking struct {
	ID          int       `json:"id"`
	CourtID     int       `json:"courtId"`
	Date        string    `json:"date"`
	Time        string    `json:"time"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"createdAt"`
}

type Slot struct {
	CourtID int    `json:"courtId"`
	Date    string `json:"date"`
	Time    string `json:"time"`
}

type PaymentGroup struct {
	ID            int       `json:"id"`
	Name          string    `json:"name"`
	Email         string    `json:"email"`
	Phone         string    `json:"phone"`
	PaymentMethod string    `json:"paymentMethod"`
	Status        string    `json:"status"`
	Slots         []Slot    `json:"slots"`
	TotalPrice    int       `json:"totalPrice"`
	PricePerSlot  int       `json:"pricePerSlot"`
	TxnId         string    `json:"txnId"`
	Receipt       string    `json:"receipt"`
	CreatedAt     time.Time `json:"createdAt"`
}

var (
	mu         sync.Mutex
	courts     []Court
	bookings   []Booking
	nextBookID = 1
	payments   []PaymentGroup
	nextPayID  = 1
)

func init() {
	courts = []Court{
		{ID: 1, Name: "Court 1"},
		{ID: 2, Name: "Court 2"},
		{ID: 3, Name: "Court 3"},
		{ID: 4, Name: "Court 4"},
		{ID: 5, Name: "Court 5"},
		{ID: 6, Name: "Court 6"},
	}
}

func withCORS(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,DELETE,PATCH,OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		h(w, r)
	}
}

func courtsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	mu.Lock()
	cs := make([]Court, len(courts))
	copy(cs, courts)
	mu.Unlock()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(cs)
}

func bookingsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	switch r.Method {
	case http.MethodGet:
		mu.Lock()
		bs := make([]Booking, len(bookings))
		copy(bs, bookings)
		mu.Unlock()
		json.NewEncoder(w).Encode(bs)
	case http.MethodPost:
		var b Booking
		if err := json.NewDecoder(r.Body).Decode(&b); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "invalid payload"})
			return
		}
		if b.CourtID <= 0 {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "courtId is required"})
			return
		}
		if b.Date == "" || b.Time == "" {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "date and time are required"})
			return
		}
		mu.Lock()
		courtFound := false
		for _, c := range courts {
			if c.ID == b.CourtID {
				courtFound = true
				break
			}
		}
		if !courtFound {
			mu.Unlock()
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "court not found"})
			return
		}
		b.ID = nextBookID
		nextBookID++
		b.CreatedAt = time.Now()
		bookings = append(bookings, b)
		mu.Unlock()
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(b)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func bookingsIDHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	idStr := strings.TrimPrefix(r.URL.Path, "/bookings/")
	if idStr == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "missing id"})
		return
	}
	id, err := strconv.Atoi(idStr)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "invalid id"})
		return
	}
	switch r.Method {
	case http.MethodDelete:
		mu.Lock()
		found := false
		for i, b := range bookings {
			if b.ID == id {
				bookings = append(bookings[:i], bookings[i+1:]...)
				found = true
				break
			}
		}
		mu.Unlock()
		if !found {
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"error": "not found"})
			return
		}
		json.NewEncoder(w).Encode(map[string]string{"ok": "deleted"})
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func paymentsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	switch r.Method {
	case http.MethodGet:
		mu.Lock()
		ps := make([]PaymentGroup, len(payments))
		copy(ps, payments)
		mu.Unlock()
		json.NewEncoder(w).Encode(ps)
	case http.MethodPost:
		var pg PaymentGroup
		if err := json.NewDecoder(r.Body).Decode(&pg); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "invalid payload"})
			return
		}
		if pg.Name == "" {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "name is required"})
			return
		}
		if len(pg.Slots) == 0 {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "slots are required"})
			return
		}
		mu.Lock()
		pg.ID = nextPayID
		nextPayID++
		pg.CreatedAt = time.Now()
		if pg.Status == "" {
			pg.Status = "PENDING"
		}
		if pg.PaymentMethod == "" {
			pg.PaymentMethod = "GCASH"
		}
		for _, slot := range pg.Slots {
			b := Booking{
				ID:          nextBookID,
				CourtID:     slot.CourtID,
				Date:        slot.Date,
				Time:        slot.Time,
				Description: fmt.Sprintf("pay:%d", pg.ID),
				CreatedAt:   pg.CreatedAt,
			}
			nextBookID++
			bookings = append(bookings, b)
		}
		payments = append(payments, pg)
		mu.Unlock()
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(pg)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func paymentsIDHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	idStr := strings.TrimPrefix(r.URL.Path, "/payments/")
	parts := strings.SplitN(idStr, "/", 2)
	id, err := strconv.Atoi(parts[0])
	if err != nil || id == 0 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "invalid id"})
		return
	}
	if len(parts) == 2 && parts[1] == "status" {
		if r.Method != http.MethodPatch {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var body struct {
			Status string `json:"status"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Status == "" {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "status required"})
			return
		}
		mu.Lock()
		found := false
		for i, p := range payments {
			if p.ID == id {
				payments[i].Status = body.Status
				found = true
				break
			}
		}
		mu.Unlock()
		if !found {
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"error": "not found"})
			return
		}
		json.NewEncoder(w).Encode(map[string]string{"ok": "updated"})
		return
	}
	switch r.Method {
	case http.MethodDelete:
		mu.Lock()
		found := false
		for i, p := range payments {
			if p.ID == id {
				descPrefix := fmt.Sprintf("pay:%d", id)
				newBs := make([]Booking, 0, len(bookings))
				for _, b := range bookings {
					if b.Description != descPrefix {
						newBs = append(newBs, b)
					}
				}
				bookings = newBs
				payments = append(payments[:i], payments[i+1:]...)
				found = true
				break
			}
		}
		mu.Unlock()
		if !found {
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"error": "not found"})
			return
		}
		json.NewEncoder(w).Encode(map[string]string{"ok": "deleted"})
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func main() {
	http.HandleFunc("/courts", withCORS(courtsHandler))
	http.HandleFunc("/bookings", withCORS(bookingsHandler))
	http.HandleFunc("/bookings/", withCORS(bookingsIDHandler))
	http.HandleFunc("/payments", withCORS(paymentsHandler))
	http.HandleFunc("/payments/", withCORS(paymentsIDHandler))
	fmt.Println("Server listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
