package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"
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

var db *sql.DB

func withCORS(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
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
	rows, err := db.Query("SELECT id, name FROM courts ORDER BY id")
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "db error"})
		return
	}
	defer rows.Close()
	var cs []Court
	for rows.Next() {
		var c Court
		if err := rows.Scan(&c.ID, &c.Name); err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
		cs = append(cs, c)
	}
	json.NewEncoder(w).Encode(cs)
}

func bookingsHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		rows, err := db.Query("SELECT id, court_id, date, time, description, created_at FROM bookings ORDER BY id DESC")
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "db error"})
			return
		}
		defer rows.Close()
		var bs []Booking
		for rows.Next() {
			var b Booking
			var created sql.NullTime
			if err := rows.Scan(&b.ID, &b.CourtID, &b.Date, &b.Time, &b.Description, &created); err != nil {
				http.Error(w, "db error", http.StatusInternalServerError)
				return
			}
			if created.Valid {
				b.CreatedAt = created.Time
			}
			bs = append(bs, b)
		}
		json.NewEncoder(w).Encode(bs)
	case http.MethodPost:
		var b Booking
		if err := json.NewDecoder(r.Body).Decode(&b); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "invalid payload"})
			return
		}
		// basic validation
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
		// ensure court exists
		var ccount int
		if err := db.QueryRow("SELECT COUNT(*) FROM courts WHERE id = ?", b.CourtID).Scan(&ccount); err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "db error"})
			return
		}
		if ccount == 0 {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "court not found"})
			return
		}
		now := time.Now()
		res, err := db.Exec("INSERT INTO bookings (court_id, date, time, description, created_at) VALUES (?, ?, ?, ?, ?)", b.CourtID, b.Date, b.Time, b.Description, now)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "db error"})
			return
		}
		id, _ := res.LastInsertId()
		b.ID = int(id)
		b.CreatedAt = now
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(b)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func ensureSchema() error {
	// Create tables if they do not exist
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS courts (
			id INT AUTO_INCREMENT PRIMARY KEY,
			name VARCHAR(255) NOT NULL
		) ENGINE=InnoDB;
	`)
	if err != nil {
		return err
	}
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS bookings (
			id INT AUTO_INCREMENT PRIMARY KEY,
			court_id INT NOT NULL,
			date VARCHAR(50) NOT NULL,
			time VARCHAR(50) NOT NULL,
			description TEXT,
			created_at DATETIME NOT NULL,
			FOREIGN KEY (court_id) REFERENCES courts(id)
		) ENGINE=InnoDB;
	`)
	if err != nil {
		return err
	}
	// Ensure a set of default courts exist: Court 1..Court 6
	desired := []string{"Court 1", "Court 2", "Court 3", "Court 4", "Court 5", "Court 6"}
	// Ensure at least 6 rows exist
	var total int
	if err := db.QueryRow("SELECT COUNT(*) FROM courts").Scan(&total); err != nil {
		return err
	}
	for i := total; i < len(desired); i++ {
		if _, err := db.Exec("INSERT INTO courts (name) VALUES (?)", desired[i]); err != nil {
			return err
		}
	}
	// Rename first 6 courts to desired names (ordered by id)
	rows, err := db.Query("SELECT id FROM courts ORDER BY id LIMIT 6")
	if err != nil {
		return err
	}
	defer rows.Close()
	ids := []int{}
	for rows.Next() {
		var id int
		if err := rows.Scan(&id); err != nil {
			return err
		}
		ids = append(ids, id)
	}
	for i, id := range ids {
		if _, err := db.Exec("UPDATE courts SET name = ? WHERE id = ?", desired[i], id); err != nil {
			return err
		}
	}
	return nil
}

func main() {
	dsn := os.Getenv("DATABASE_DSN")
	if dsn == "" {
		// default: user root no password, localhost, db booking_system
		dsn = "root:root@tcp(127.0.0.1:3306)/booking_system?parseTime=true"
	}
	var err error
	db, err = sql.Open("mysql", dsn)
	if err != nil {
		log.Fatalf("failed to open db: %v", err)
	}
	// Verify connection
	if err := db.Ping(); err != nil {
		log.Fatalf("failed to connect to db: %v\nDSN used: %s", err, dsn)
	}
	if err := ensureSchema(); err != nil {
		log.Fatalf("failed to ensure schema: %v", err)
	}

	http.HandleFunc("/courts", withCORS(courtsHandler))
	http.HandleFunc("/bookings", withCORS(bookingsHandler))
	http.HandleFunc("/bookings/", withCORS(bookingsIDHandler))
	fmt.Println("Server listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func bookingsIDHandler(w http.ResponseWriter, r *http.Request) {
	// URL path: /bookings/{id}
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
		res, err := db.Exec("DELETE FROM bookings WHERE id = ?", id)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "db error"})
			return
		}
		n, _ := res.RowsAffected()
		if n == 0 {
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"error": "not found"})
			return
		}
		json.NewEncoder(w).Encode(map[string]string{"ok": "deleted"})
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}
