def evaluate_rbac(user, resource):
    if user.role == "Admin":
        return True, "Admin override granted"
    if user.role == "Employee" and resource.department == user.department:
        return True, "Employee allowed for matching department"
    if user.role == "Guest" and resource.sensitivity == "Low":
        return True, "Guest allowed for low sensitivity file"
    return False, "RBAC denied access"

def evaluate_abac(user, resource, env: dict):
    if user.role == "Admin":
        return True, "Admin override granted"

    if resource.sensitivity == "High":
        if not (9 <= env["current_hour"] <= 17):
            return False, "High sensitivity files only accessible in business hours"
        if not env["ip_address"].startswith(("192.168.", "10.", "172.16.")):
            return False, "High sensitivity files require internal network access"

    if resource.department != user.department and user.role != "Admin":
        return False, "Department mismatch"

    if user.role == "Guest" and resource.sensitivity in ("Medium", "High"):
        return False, "Guest cannot access medium or high sensitivity files"

    return True, "ABAC granted access"