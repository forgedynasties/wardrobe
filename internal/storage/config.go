package storage

import (
	"database/sql"
	"encoding/json"
)

func (s *Store) GetConfig(key string) (json.RawMessage, error) {
	var value json.RawMessage
	err := s.db.QueryRow(`SELECT value FROM app_config WHERE key = $1`, key).Scan(&value)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return value, err
}

func (s *Store) SetConfig(key string, value json.RawMessage) error {
	_, err := s.db.Exec(`
		INSERT INTO app_config (key, value, updated_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
		key, value)
	return err
}
