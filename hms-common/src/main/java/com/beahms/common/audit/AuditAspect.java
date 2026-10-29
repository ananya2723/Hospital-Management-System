package com.beahms.common.audit;

import com.beahms.common.security.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;

@Aspect
@Component
public class AuditAspect {

    private static final Logger log = LoggerFactory.getLogger(AuditAspect.class);
    private final JdbcTemplate jdbcTemplate;

    public AuditAspect(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Around("@annotation(audited)")
    public Object logAudit(ProceedingJoinPoint joinPoint, Audited audited) throws Throwable {
        Object result = joinPoint.proceed();

        try {
            saveAuditRecord(audited.action(), audited.entityType(), joinPoint.getArgs());
        } catch (Exception ex) {
            log.warn("Failed to write audit log record: {}", ex.getMessage());
        }

        return result;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void saveAuditRecord(String action, String entityType, Object[] args) {
        String userId = "ANONYMOUS";
        String role = "UNKNOWN";
        Long branchId = 1L;

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal principal) {
            userId = principal.getUserId();
            role = principal.getRole();
            branchId = principal.getBranchId() != null ? principal.getBranchId() : 1L;
        }

        String clientIp = "127.0.0.1";
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes != null) {
            HttpServletRequest request = attributes.getRequest();
            String xfHeader = request.getHeader("X-Forwarded-For");
            clientIp = (xfHeader == null) ? request.getRemoteAddr() : xfHeader.split(",")[0];
        }

        String entityId = null;
        if (args != null && args.length > 0) {
            entityId = String.valueOf(args[0]);
        }

        String sql = "INSERT INTO audit_log (id, user_id, role, action, entity_type, entity_id, timestamp, ip_address, branch_id) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";

        jdbcTemplate.update(sql,
                UUID.randomUUID(),
                userId,
                role,
                action,
                entityType,
                entityId,
                Timestamp.from(Instant.now()),
                clientIp,
                branchId
        );
    }
}
