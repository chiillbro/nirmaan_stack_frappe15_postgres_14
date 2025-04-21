# nirmaan_stack/api.py
import frappe
from frappe.realtime import publish_realtime
import frappe.realtime
from frappe.utils import get_fullname, format_datetime, cint # Import necessary utils
from datetime import datetime

# Define a specific type hint for the return data for clarity
from typing import TypedDict, Optional, List, Dict

# class FileInfo(TypedDict):
#     name: str

class ProjectMessageAttachment(TypedDict):
    name: str
    file_name: str
    file_url: str
    is_private: int # 0 or 1


class ProjectMessageDict(TypedDict):
    name: str
    project: str
    sender: str
    message_content: str
    timestamp: str # Formatted string
    owner: str
    sender_full_name: Optional[str]
    attachments: Optional[List[ProjectMessageAttachment]]


@frappe.whitelist()
def send_project_message(project_name: str, message_content: Optional[str] = None, attachments: Optional[List[Dict[str, str]]] = None) -> ProjectMessageDict:
    print("attachemtns", attachments)
    """
    Creates a new Project Discussion Message with optional text and attachments,
    saves it, and publishes it via Socket.IO.

    Args:
        project_name: The name (ID) of the project.
        message_content: The text content of the message (optional if attachments provided).
        attachments: A list of file info objects [{"name": "file_doc_id"}, ...]
                     referencing uploaded File documents.

    Returns:
        A dictionary representing the newly created message document, enhanced.

    Raises:
        frappe.ValidationError: If input is invalid.
        frappe.PermissionError: If the user cannot read the specified project.
        frappe.DoesNotExistError: If the project does not exist.
        Exception: For database or other errors during message creation.
    """
    if not isinstance(project_name, str) or not project_name:
        frappe.throw("Project Name must be a non-empty string.", frappe.ValidationError)

     # --- Validation: Ensure either message or attachments exist ---
    # Strip whitespace from message content if it exists
    trimmed_content = message_content.strip() if isinstance(message_content, str) else None
    has_attachments = isinstance(attachments, list) and len(attachments) > 0
    if not trimmed_content and not has_attachments:
        frappe.throw("Message cannot be empty without attachments.", frappe.ValidationError)

    current_user = frappe.session.user
    if not current_user or current_user == "Guest":
         frappe.throw("You must be logged in to send messages.", frappe.PermissionError)

    # 1. Permission Check (Implicit + Explicit)
    # Ensure user has at least READ access to the project. This prevents
    # posting to projects they shouldn't even know exist.
    # frappe.get_doc automatically checks read permission.
    try:
        # Check read permission on the project itself
        if not frappe.has_permission("Projects", ptype="read", doc=project_name):
             print("no read permission")
             raise frappe.PermissionError("User does not have read access to the project.")
        # Additionally, ensure the user has CREATE permission on the message DocType
        # This check is also performed by `insert()` if ignore_permissions=False
        if not frappe.has_permission("Project Discussion Message", ptype="create"):
            print("no permission")
            raise frappe.PermissionError("User does not have permission to create messages.")

    except frappe.DoesNotExistError:
         frappe.throw(f"Project '{project_name}' not found.", frappe.DoesNotExistError)
    # PermissionError will be raised automatically by has_permission if check fails

    # 2. Create and Insert the Message Document
    try:
        new_message_doc = frappe.get_doc({
            "doctype": "Project Discussion Message",
            "project": project_name,
            "message_content": trimmed_content,
            # 'sender' is automatically set to 'owner'/'__user' via field default
            # 'timestamp' is automatically set via field default 'Now'
        })

        # --- Link Attachments ---
        if has_attachments:
            valid_file_names = [f.get("name") for f in attachments if isinstance(f, dict) and f.get("name")]
            if not valid_file_names:
                 frappe.throw("Invalid attachment data provided.", frappe.ValidationError)

            # Verify files exist and user has read permission on them
            # This prevents users from attaching files they don't own or have access to.
            # `get_list` respects permissions by default.
            accessible_files = frappe.get_list(
                 "File",
                 filters={"name": ["in", valid_file_names]},
                 fields=["name"],
                 limit=len(valid_file_names) # Fetch max needed
            )
            accessible_file_names = {f.name for f in accessible_files}

            for file_info in attachments:
                print(f"file_info: {file_info}")
                file_name = file_info.get("name")
                if file_name in accessible_file_names:
                    print(f"Appending attachment link: Field='file', Value='{file_name}', Type={type(file_name)}") # DEBUG LOG
                    # Add row to child table. The linked 'File' doc name is sufficient.
                    new_message_doc.append("attachments", {
                        "name": file_name # The field name in the Child Table matching the Link field to 'File'
                                           # By default, linking to 'File' DocType implicitly creates a field named 'file'. Check your child table definition if different.
                    })
                else:
                     # Log warning or error: User tried to attach inaccessible file
                     frappe.logger().warning(f"User '{current_user}' attempted to attach inaccessible file '{file_name}' to project '{project_name}' message.")
                     # Optionally throw an error, or just ignore the inaccessible file.
                     # For robustness, let's ignore it for now.
                     # frappe.throw(f"You do not have permission to attach file: {file_name}", frappe.PermissionError)

            # Re-validate: Ensure at least one valid attachment was added if content was empty
            if not trimmed_content and not new_message_doc.attachments:
                 frappe.throw("No valid attachments could be added.", frappe.ValidationError)
        # insert() checks 'create' permission on the DocType for the user.
        # It also runs standard save/validate hooks if defined.
        new_message_doc.insert(ignore_permissions=False)
        print("new_message_doc.insert", new_message_doc)
        # Important: Do not commit here. Let Frappe manage the transaction commit.
        # publish_realtime with after_commit=True is generally safer if available/needed,
        # but for chat, immediate emission is usually preferred for responsiveness.

    except Exception as e:
        frappe.log_error(
            message=f"Failed to insert project message for Project '{project_name}' by User '{current_user}'",
            title="Project Chat Message Insertion Error"
        )
        # Provide a generic error to the user
        frappe.throw(f"An error occurred while saving the message. Please try again.")

    # 3. Prepare Real-time Payload
    # Fetch sender's full name for immediate display on clients
    sender_full_name = get_fullname(new_message_doc.owner) # Use Frappe util
    # Convert to dictionary for JSON serialization
    message_data: ProjectMessageDict = new_message_doc.as_dict()
    message_data['sender_full_name'] = sender_full_name
    # Format timestamp consistently for all clients
    message_data['timestamp'] = format_datetime(new_message_doc.timestamp, "yyyy-MM-dd HH:mm:ss") # Example format
    message_data['attachments'] = [] # Initialize as empty list


     # Fetch details for linked attachments to include in the payload
    if new_message_doc.attachments:
        file_names_to_fetch = [att.name for att in new_message_doc.attachments if att.name]
        if file_names_to_fetch:
            file_docs = frappe.get_list(
                "File",
                filters={"name": ["in", file_names_to_fetch]},
                fields=["name", "file_name", "file_url", "is_private"] # Get needed fields
            )
            # Create a map for quick lookup
            file_map = {f.name: f for f in file_docs}

            # Populate attachment details in the payload
            for att in new_message_doc.attachments:
                 file_doc_details = file_map.get(att.name)
                 if file_doc_details:
                     message_data['attachments'].append({
                        "name": att.name, # Child table row name
                        "file_name": file_doc_details.file_name,
                        "file_url": file_doc_details.file_url,
                        "is_private": cint(file_doc_details.is_private) # Ensure integer 0 or 1
                     })

    # 4. Publish to Project-Specific Room via Redis
    # Define a consistent and secure room naming convention
    # room_name = f"project_chat_{project_name}"
    room_name = frappe.realtime.get_doc_room("Projects", project_name) # Use the Project Doc room

    try:
        publish_realtime(
            event="new_project_message", # Specific event name
            message=message_data,        # Rich payload
            room=room_name,              # Target the specific project room
            after_commit=False           # Emit immediately for chat responsiveness
        )
        frappe.logger("realtime").debug(f"Published 'new_project_message' to room '{room_name}'")
        print(f"Published 'new_project_message' to room '{room_name}'")

    except Exception as e:
         # Log if publishing fails, but don't necessarily fail the request
         frappe.log_error(
             message=f"Failed to publish real-time message to room '{room_name}'",
             title="Real-time Publishing Error"
         )
         print(f"Failed to publish real-time message to room '{room_name}'")

    # 5. Return the Created Message Data
    # This allows the sending client to potentially perform an optimistic update
    return message_data


@frappe.whitelist()
def update_typing_status(project_name: str, is_typing: bool):
    """
    Handles typing status updates from clients and broadcasts them
    to the relevant project document room.

    Args:
        project_name: The name (ID) of the project.
        is_typing: Boolean indicating if the user started (True) or stopped (False) typing.
    """
    if not isinstance(project_name, str) or not project_name:
        frappe.throw("Project Name must be a non-empty string.", frappe.ValidationError)
    if not isinstance(is_typing, bool):
         # Basic type check for the boolean flag
         frappe.throw("Typing status must be true or false.", frappe.ValidationError)

    current_user = frappe.session.user
    if not current_user or current_user == "Guest":
        # Don't need to throw, just ignore guests silently maybe? Or throw if required.
        # frappe.throw("You must be logged in to update typing status.", frappe.PermissionError)
         return {"status": "ignored", "reason": "User not logged in"}


    # 1. Permission Check: Can the current user access this project?
    # Use has_permission for efficiency if we don't need the doc object itself
    if not frappe.has_permission("Projects", ptype="read", doc=project_name):
        # Log this attempt potentially
        frappe.logger("security").warning(f"User '{current_user}' attempted to update typing status for inaccessible Project '{project_name}'")
        # Don't throw PermissionError to client maybe, just return failure
        return {"status": "error", "reason": "Permission denied"}
        # Or throw if strictness is desired:
        # raise frappe.PermissionError("User does not have read access to the project.")


    # 2. Determine Event Name and Prepare Payload
    event_name = "start_typing_project_chat" if is_typing else "stop_typing_project_chat"
    user_full_name = get_fullname(current_user)

    message_payload = {
        "user": current_user,
        "user_full_name": user_full_name,
        "project": project_name, # Include project name for frontend filtering
    }

    # 3. Publish to Project Document Room
    room_name = frappe.realtime.get_doc_room("Projects", project_name)
    try:
        publish_realtime(
            event=event_name,
            message=message_payload,
            room=room_name,
            after_commit=False # Typing indicators should be immediate
        )
        frappe.logger("realtime").debug(f"Published '{event_name}' to room '{room_name}' for User '{current_user}'")
        return {"status": "success"}

    except Exception as e:
         frappe.log_error(
             message=f"Failed to publish typing status to room '{room_name}' for User '{current_user}'",
             title="Real-time Typing Status Error"
         )
         # Let client know it might have failed
         return {"status": "error", "reason": "Failed to broadcast status"}


# *** NEW *** API Endpoint for Paginated Message Fetching
# =======================================================
class PaginatedMessagesResponse(TypedDict):
    messages: List[ProjectMessageDict]
    has_more: bool

@frappe.whitelist()
def get_project_messages(project_name: str, limit: int = 50, start: int = 0) -> PaginatedMessagesResponse:
    """
    Fetches a paginated list of messages for a specific project,
    ordered newest first (descending timestamp).

    Args:
        project_name: The name (ID) of the project.
        limit: The maximum number of messages to return per page (page size).
        start: The starting index (offset) for pagination.

    Returns:
        A dictionary containing a list of messages and a boolean indicating
        if more messages are available.

    Raises:
        frappe.PermissionError: If the user cannot read the specified project.
        frappe.DoesNotExistError: If the project does not exist.
    """
    limit = int(limit) # Ensure integer type
    start = int(start) # Ensure integer type

    if not isinstance(project_name, str) or not project_name:
        frappe.throw("Project Name must be a non-empty string.", frappe.ValidationError)
    if not limit > 0:
        limit = 50 # Enforce a default positive limit
    if not start >= 0:
        start = 0 # Enforce non-negative start

    current_user = frappe.session.user
    if not current_user or current_user == "Guest":
        frappe.throw("You must be logged in to view messages.", frappe.PermissionError)

    # 1. Permission Check (Crucial for data access)
    if not frappe.has_permission("Projects", ptype="read", doc=project_name):
        # Log potentially, but throw error to client
        frappe.logger("security").warning(f"User '{current_user}' attempted to read messages for inaccessible Project '{project_name}'")
        raise frappe.PermissionError("User does not have read access to the project.")
        # Also check read permission on the message doctype itself
    if not frappe.has_permission("Project Discussion Message", ptype="read"):
         raise frappe.PermissionError("User does not have permission to read messages.")


    # 2. Database Query (Optimized for Pagination)
    # Fetch one extra message to determine if there are more pages
    fetch_limit = limit + 1

    try:
        # Use frappe.get_list for efficient fetching of specific fields
        # Order by timestamp descending to get newest first
        message_docs = frappe.get_list(
            "Project Discussion Message",
            filters={"project": project_name},
            fields=["name", "owner", "message_content", "timestamp", "creation"], # Fetch creation for stable sort fallback
            order_by="timestamp DESC, creation DESC", # Sort newest first
            limit_start=start,
            limit=fetch_limit,
            ignore_permissions=False, # Let get_list apply user permissions based on project link
            as_list=False # Return list of dictionaries
        )

        print("messages_docs", message_docs)

        grouped_messages = {}
        for row in message_docs:
            msg_name = row.name
            if msg_name not in grouped_messages:
                grouped_messages[msg_name] = { # Store parent doc details
                     "name": msg_name,
                     "owner": row.owner,
                     "message_content": row.message_content,
                     "timestamp": row.timestamp,
                     "creation": row.creation,
                     "attachments": [] # Initialize attachments list
                }
            if row.get("attachment_file_id"): # Check if attachment file ID exists for this row
                 # Avoid duplicates if get_list returns multiple rows for same parent+child
                 if not any(att.get("file") == row.attachment_file_id for att in grouped_messages[msg_name]["attachments"]):
                    grouped_messages[msg_name]["attachments"].append({"file": row.attachment_file_id})


        # Convert grouped data back to a list ordered by original timestamp/creation
        ordered_grouped_messages = sorted(grouped_messages.values(), key=lambda x: (x['timestamp'], x['creation']))

    except Exception as e:
         frappe.log_error(
             message=f"Failed to fetch messages for Project '{project_name}', start={start}, limit={limit}",
             title="Project Chat Message Fetch Error"
         )
         frappe.throw("An error occurred while fetching messages.")


    # 3. Determine if more messages exist (use length before grouping if flattened)
    has_more = len(message_docs) == fetch_limit # Check raw fetched length
    # If we fetched extra, remove the last *group* if necessary (tricky with grouping)
    # It's safer to adjust the limit logic based on distinct message names if grouped.
    # For now, rely on the raw count for has_more, and adjust if needed.
    final_message_list = ordered_grouped_messages[:limit] if has_more else ordered_grouped_messages

    # 4. Prepare Response Payload (resolve full names and attachment details)
    messages_result: List[ProjectMessageDict] = []
    user_full_names = {}
    all_file_ids = {att['file'] for msg in final_message_list for att in msg.get('attachments', []) if att.get('file')}

    # Fetch all needed file details in one go
    file_details_map = {}
    if all_file_ids:
        file_docs = frappe.get_list("File", filters={"name": ["in", list(all_file_ids)]}, fields=["name", "file_name", "file_url", "is_private"])
        file_details_map = {f.name: f for f in file_docs}

    for doc_data in final_message_list:
        owner = doc_data.get("owner")
        # ... (resolve sender full name logic - same as before) ...
        sender_full_name = user_full_names.get(owner) # ...

        populated_attachments = []
        for att in doc_data.get("attachments", []):
             file_doc_details = file_details_map.get(att['file'])
             if file_doc_details:
                 populated_attachments.append({
                    "name": att.get("name", ""), # Child doc name isn't fetched easily here, maybe not needed for frontend
                    "file_name": file_doc_details.file_name,
                    "file_url": file_doc_details.file_url,
                    "is_private": cint(file_doc_details.is_private)
                 })

        messages_result.append({
            "name": doc_data["name"],
            "project": project_name,
            "sender": owner,
            "message_content": doc_data["message_content"],
            "timestamp": format_datetime(doc_data["timestamp"], "yyyy-MM-dd HH:mm:ss"),
            "owner": owner,
            "sender_full_name": sender_full_name or owner,
            "attachments": populated_attachments # Add populated attachments
        })

    # Ensure the order matches the requested DESC order (newest first)
    # The sorting key lambda was already reversed, so list is correct.

    return {
        "messages": messages_result,
        "has_more": has_more
    }

    # --- Dummy Data Generation for Stress Testing ---
    # total_messages = 10000
    # dummy_messages: List[ProjectMessageDict] = []
    # end_index = min(start + limit, total_messages)

    # for idx in range(start, end_index):
    #     dummy_messages.append({
    #         "name": f"msg-{idx}",
    #         "project": project_name,
    #         "sender": "system",
    #         "message_content": f"Message {idx + 1}",
    #         "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    #         "owner": "system",
    #         "sender_full_name": "system"
    #     })

    # has_more = end_index < total_messages

    # return {
    #     "messages": dummy_messages,
    #     "has_more": has_more
    # }