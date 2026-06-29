package com.jumpstart.user;

/** Platform-wide roles. Organization and Admin can be extended with finer-grained
 *  permissions later; for the MVP, role checks happen at the endpoint level via
 *  @PreAuthorize and at the data level via ownership checks in each service. */
public enum Role {
    STUDENT,
    MENTOR,
    ORGANIZATION,
    ADMIN
}
