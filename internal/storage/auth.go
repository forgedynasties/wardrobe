package storage

import (
	"crypto/rand"
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

func (s *Store) SetUserAdmin(username string, admin bool) error {
	_, err := s.db.Exec(`UPDATE users SET is_admin = $1, updated_at = NOW() WHERE username = $2`, admin, username)
	return err
}

func (s *Store) DeleteUser(username string) error {
	res, err := s.db.Exec(`DELETE FROM users WHERE username = $1`, username)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (s *Store) GetUserByEmail(email string) (*domain.User, error) {
	var u domain.User
	err := s.db.QueryRow(`
		SELECT id, username, display_name, password_hash, is_admin, is_active, created_at, updated_at
		FROM users WHERE email = $1`, email).
		Scan(&u.ID, &u.Username, &u.DisplayName, &u.PasswordHash, &u.IsAdmin, &u.IsActive, &u.CreatedAt, &u.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &u, err
}

// StorePendingSignup upserts a pending signup row (keyed on email).
// Returns the generated 6-digit OTP code (plain text) for sending.
func (s *Store) StorePendingSignup(email, username, displayName, password string) (string, error) {
	pwHash, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	if err != nil {
		return "", fmt.Errorf("hash password: %w", err)
	}

	code := fmt.Sprintf("%06d", mustRandInt(1000000))
	h := sha256.Sum256([]byte(code))
	otpHash := fmt.Sprintf("%x", h)
	expiresAt := time.Now().Add(10 * time.Minute)

	_, err = s.db.Exec(`
		INSERT INTO pending_signups (email, username, display_name, password_hash, otp_hash, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (email) DO UPDATE SET
			username = EXCLUDED.username,
			display_name = EXCLUDED.display_name,
			password_hash = EXCLUDED.password_hash,
			otp_hash = EXCLUDED.otp_hash,
			expires_at = EXCLUDED.expires_at,
			created_at = NOW()`,
		email, username, displayName, string(pwHash), otpHash, expiresAt)
	if err != nil {
		return "", err
	}
	return code, nil
}

// VerifyPendingSignup checks the OTP, creates the user, and cleans up the pending row.
// Returns the new User on success, nil if OTP is invalid/expired.
func (s *Store) VerifyPendingSignup(email, code string) (*domain.User, error) {
	h := sha256.Sum256([]byte(code))
	otpHash := fmt.Sprintf("%x", h)

	var ps struct {
		Username     string
		DisplayName  string
		PasswordHash string
	}
	err := s.db.QueryRow(`
		SELECT username, display_name, password_hash FROM pending_signups
		WHERE email = $1 AND otp_hash = $2 AND expires_at > NOW()`,
		email, otpHash).
		Scan(&ps.Username, &ps.DisplayName, &ps.PasswordHash)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	var u domain.User
	err = s.db.QueryRow(`
		INSERT INTO users (username, display_name, email, password_hash, is_admin, is_active)
		VALUES ($1, $2, $3, $4, false, true)
		RETURNING id, username, display_name, password_hash, is_admin, is_active, created_at, updated_at`,
		ps.Username, ps.DisplayName, email, ps.PasswordHash).
		Scan(&u.ID, &u.Username, &u.DisplayName, &u.PasswordHash, &u.IsAdmin, &u.IsActive, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}

	_, _ = s.db.Exec(`DELETE FROM pending_signups WHERE email = $1`, email)
	return &u, nil
}

// StorePasswordReset generates an OTP for a password reset and stores it.
// Returns the plain OTP code and nil error, or ("", nil) if the email has no active account.
func (s *Store) StorePasswordReset(email string) (string, error) {
	user, err := s.GetUserByEmail(email)
	if err != nil {
		return "", err
	}
	if user == nil || !user.IsActive {
		return "", nil
	}

	code := fmt.Sprintf("%06d", mustRandInt(1000000))
	h := sha256.Sum256([]byte(code))
	otpHash := fmt.Sprintf("%x", h)
	expiresAt := time.Now().Add(10 * time.Minute)

	_, err = s.db.Exec(`
		INSERT INTO password_resets (email, otp_hash, expires_at)
		VALUES ($1, $2, $3)
		ON CONFLICT (email) DO UPDATE SET
			otp_hash = EXCLUDED.otp_hash,
			expires_at = EXCLUDED.expires_at,
			created_at = NOW()`,
		email, otpHash, expiresAt)
	if err != nil {
		return "", err
	}
	return code, nil
}

// VerifyPasswordReset checks the OTP, updates the password, and returns the user for session creation.
// Returns nil user if OTP is invalid or expired.
func (s *Store) VerifyPasswordReset(email, code, newPassword string) (*domain.User, error) {
	h := sha256.Sum256([]byte(code))
	otpHash := fmt.Sprintf("%x", h)

	var count int
	err := s.db.QueryRow(`
		SELECT COUNT(*) FROM password_resets
		WHERE email = $1 AND otp_hash = $2 AND expires_at > NOW()`,
		email, otpHash).Scan(&count)
	if err != nil {
		return nil, err
	}
	if count == 0 {
		return nil, nil
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), 12)
	if err != nil {
		return nil, err
	}

	var u domain.User
	err = s.db.QueryRow(`
		UPDATE users SET password_hash = $1, updated_at = NOW()
		WHERE email = $2 AND is_active = true
		RETURNING id, username, display_name, password_hash, is_admin, is_active, created_at, updated_at`,
		string(hash), email).
		Scan(&u.ID, &u.Username, &u.DisplayName, &u.PasswordHash, &u.IsAdmin, &u.IsActive, &u.CreatedAt, &u.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	_, _ = s.db.Exec(`DELETE FROM password_resets WHERE email = $1`, email)
	return &u, nil
}

func mustRandInt(max int) int {
	b := make([]byte, 4)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	n := int(b[0])<<24 | int(b[1])<<16 | int(b[2])<<8 | int(b[3])
	if n < 0 {
		n = -n
	}
	return n % max
}
