import java.io.*;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.util.*;

public final class ProvisionSuperAdmin {
    public static void main(String[] args) {
        try { provision(); }
        catch (Exception e) {
            // Database exceptions may include account data. Never print their messages.
            System.err.println("Provisioning failed: " + e.getClass().getSimpleName());
            System.exit(1);
        }
    }
    private static void provision() throws Exception {
        BufferedReader input = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8));
        String digits = input.readLine();
        String password = input.readLine();
        if (digits == null || !digits.matches("[6-9][0-9]{9}") || password == null ||
            password.length() < 12 || password.getBytes(StandardCharsets.UTF_8).length > 72 ||
            input.readLine() != null) throw new IllegalArgumentException();
        String phone = "+91" + digits;
        Object encoder = Class.forName("org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder")
                .getConstructor(int.class).newInstance(12);
        var encode = encoder.getClass().getMethod("encode", CharSequence.class);
        var matches = encoder.getClass().getMethod("matches", CharSequence.class, String.class);
        try (Connection db = DriverManager.getConnection(System.getenv("DB_URL"),
                System.getenv("DB_USER"), System.getenv("DB_PASSWORD"))) {
            db.setAutoCommit(false);
            try {
                try (Statement s = db.createStatement()) {
                    s.execute("SET LOCAL lock_timeout = '5s'");
                    s.execute("LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE");
                }
                long id = -1;
                try (PreparedStatement s = db.prepareStatement(
                        "SELECT id,role,is_admin,is_super_user,active,password FROM users " +
                        "WHERE regexp_replace(phone, '[^0-9]', '', 'g') IN (?, ?, ?)")) {
                    s.setString(1, digits); s.setString(2, "91" + digits); s.setString(3, "0" + digits);
                    try (ResultSet r = s.executeQuery()) {
                        if (r.next()) {
                            id = r.getLong("id");
                            boolean valid = "SUPER_ADMIN".equals(r.getString("role")) &&
                                r.getBoolean("is_admin") && r.getBoolean("is_super_user") &&
                                r.getBoolean("active") &&
                                Boolean.TRUE.equals(matches.invoke(encoder, password, r.getString("password")));
                            if (!valid || r.next()) {
                                System.err.println("Account collision: no existing user was modified.");
                                throw new IllegalStateException();
                            }
                            db.rollback();
                            System.out.println("Existing super admin already matches; no changes made.");
                            return;
                        }
                    }
                }
                try (PreparedStatement s = db.prepareStatement(
                        "INSERT INTO users (phone,password,name,is_admin,is_super_user,role,active," +
                        "terms_accepted,must_change_password,created_at) VALUES (?,?,'Bro & Bro Super Admin'," +
                        "true,true,'SUPER_ADMIN',true,false,false,now()) RETURNING id")) {
                    s.setString(1, phone);
                    s.setString(2, (String) encode.invoke(encoder, password));
                    try (ResultSet r = s.executeQuery()) {
                        if (!r.next()) throw new IllegalStateException();
                        id = r.getLong(1);
                    }
                }
                try (PreparedStatement s = db.prepareStatement("INSERT INTO wallets(user_id,balance) VALUES (?,0)")) {
                    s.setLong(1, id); s.executeUpdate();
                }
                // SUPER_ADMIN has implicit access to every active location in LocationAccessService.
                db.commit();
                System.out.println("New super admin and zero-balance wallet created.");
            } catch (Exception e) { db.rollback(); throw e; }
        }
    }
}
