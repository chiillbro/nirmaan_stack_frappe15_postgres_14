import frappe

@frappe.whitelist()
def delete_custom_po(po_id: str):
    """
    Deletes a Procurement Order and its associated Procurement Request, along with any attachments.

    Args:
        po_id (str): The name (ID) of the Procurement Order to delete.
    """
    try:
        po_doc = frappe.get_doc("Procurement Orders", po_id)
        if not po_doc:
            raise frappe.ValidationError(f"Procurement Order {po_id} not found.")

        pr_name = po_doc.procurement_request
        pr_doc = frappe.get_doc("Procurement Requests", pr_name)
        if not pr_doc:
            raise frappe.ValidationError(f"Procurement Request {pr_name} not found.")

        # Make sure the doctype is set correctly to match the attachments associated with the PR
        attachments = frappe.db.get_list(
            "Nirmaan Attachments", 
            filters={
                "associated_docname": pr_name, 
                "associated_doctype": "Procurement Requests"
            }, 
            fields=["name"]
        )
        for att in attachments:
            frappe.delete_doc("Nirmaan Attachments", att.name)

        # Now delete the Procurement Order and Request
        frappe.delete_doc("Procurement Orders", po_id)
        frappe.delete_doc("Procurement Requests", pr_name)

        return {"message": "Procurement Order and associated Procurement Request deleted successfully.", "status": 200}

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "delete_custom_po")
        return {"error": f"Failed to delete Procurement Order and/or Procurement Request: {str(e)}", "status": 400}