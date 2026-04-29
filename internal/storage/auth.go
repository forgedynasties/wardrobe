package storage

import (
	"crypto/sha256"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"hangur/internal/domain"
)

func (s *Store) GetUserByUsername(username string) (*domain.User, error) {
	var u domain.User
	err := s.db.QueryRow(`
		SELECT id, username, display_name, password_hash, is_admin, is_active, created_at, updated_at
		FROM users WHERE username = $1`, username).
		Scan(&u.ID, &u.Username, &u.DisplayName, &u.PasswordHash, &u.IsAdmin, &u.IsActive, &u.CreatedAt, &u.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &u, err
}

func (s *Store) CreateUser(username, displayName, password string, isAdmin bool) (*domain.User, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}
	var u domain.User
	err = s.db.QueryRow(`
		INSERT INTO users (username, display_name, password_hash, is_admin)
		VALUES ($1, $2, $3, $4)
		RETURNING id, username, display_name, password_hash, is_admin, is_active, created_at, updated_at`,
		username, displayName, string(hash), isAdmin).
		Scan(&u.ID, &u.Username, &u.DisplayName, &u.PasswordHash, &u.IsAdmin, &u.IsActive, &u.CreatedAt, &u.UpdatedAt)
	return &u, err
}

func (s *Store) AuthenticateUser(username, password string) (*domain.User, error) {
	u, err := s.GetUserByUsername(username)
	if err != nil || u == nil {
		return nil, nil
	}
	if !u.IsActive {
		return nil, nil
	}
	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password)); err != nil {
		return nil, nil
	}
	return u, nil
}

func (s *Store) ListUsers() ([]*domain.User, error) {
	rows, err := s.db.Query(`
		SELECT id, username, display_name, is_admin, is_active, created_at, updated_at
		FROM users ORDER BY created_at ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var users []*domain.User
	for rows.Next() {
		u := &domain.User{}
		if err := rows.Scan(&u.ID, &u.Username, &u.DisplayName, &u.IsAdmin, &u.IsActive, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

func (s *Store) AdminResetPassword(username, newPassword string) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), 12)
	if err != nil {
		return err
	}
	_, err = s.db.Exec(`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE username = $2`, string(hash), username)
	return err
}

func (s *Store) SetUserActive(username string, active bool) error {
	_, err := s.db.Exec(`UPDATE users SET is_active = $1, updated_at = NOW() WHERE username = $2`, active, username)
	return err
}

func (s *Store) ChangePassword(username, currentPassword, newPassword string) error {
	u, err := s.GetUserByUsername(username)
	if err != nil || u == nil {
		return fmt.Errorf("user not found")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(currentPassword)); err != nil {
		return fmt.Errorf("invalid current password")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), 12)
	if err != nil {
		return err
	}
	_, err = s.db.Exec(`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE username = $2`, string(hash), username)
	return err
}

func (s *Store) CreateSession(userID uuid.UUID, token string, expiry time.Duration) (*domain.Session, error) {
	h := sha256.Sum256([]byte(token))
	tokenHash := fmt.Sprintf("%x", h)
	expiresAt := time.Now().Add(expiry)

	var sess domain.Session
	err := s.db.QueryRow(`
		INSERT INTO sessions (user_id, token_hash, expires_at)
		VALUES ($1, $2, $3)
		RETURNING id, user_id, token_hash, expires_at, last_used_at, created_at`,
		userID, tokenHash, expiresAt).
		Scan(&sess.ID, &sess.UserID, &sess.TokenHash, &sess.ExpiresAt, &sess.LastUsedAt, &sess.CreatedAt)
	return &sess, err
}

// GetSessionUser validates a raw session token and returns the associated user.
// Updates last_used_at. Returns nil if token invalid or expired.
func (s *Store) GetSessionUser(token string) (*domain.User, error) {
	h := sha256.Sum256([]byte(token))
	tokenHash := fmt.Sprintf("%x", h)

	var u domain.User
	err := s.db.QueryRow(`
		UPDATE sessions SET last_used_at = NOW()
		WHERE token_hash = $1 AND expires_at > NOW()
		RETURNING user_id`,
		tokenHash).Scan(&u.ID)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	err = s.db.QueryRow(`
		SELECT id, username, display_name, password_hash, is_admin, is_active, created_at, updated_at
		FROM users WHERE id = $1`, u.ID).
		Scan(&u.ID, &u.Username, &u.DisplayName, &u.PasswordHash, &u.IsAdmin, &u.IsActive, &u.CreatedAt, &u.UpdatedAt)
	return &u, err
}

func (s *Store) DeleteSession(token string) error {
	h := sha256.Sum256([]byte(token))
	tokenHash := fmt.Sprintf("%x", h)
	_, err := s.db.Exec(`DELETE FROM sessions WHERE token_hash = $1`, tokenHash)
	return err
}

// PurgeExpiredSessions removes all expired sessions. Call periodically.
func (s *Store) PurgeExpiredSessions() error {
	_, err := s.db.Exec(`DELETE FROM sessions WHERE expires_at < NOW()`)
	return err
}
