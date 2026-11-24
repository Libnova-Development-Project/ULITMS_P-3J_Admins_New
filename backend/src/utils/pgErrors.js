function pgError(error) {
  if (error.code === '23505') return { status: 409, message: 'A duplicate value already exists' };
  if (error.code === '23503') return { status: 409, message: 'Referenced record does not exist' };
  if (error.code === '23514') return { status: 400, message: 'Invalid value for a database constraint' };
  if (error.code === '22P02') return { status: 400, message: 'Invalid identifier or data type' };
  if (error.code === '42501') return { status: 403, message: 'Database operation is not permitted' };

  const message = error.message || 'Database operation failed';
  if (/No copy available|already have an|already decided|not available|taken|already active|overdue|limit reached|only borrowed|Only approved|inactive|suspended|no active session|already registered|already/i.test(message)) {
    return { status: 409, message };
  }
  if (/not found|does not exist|account is/i.test(message)) {
    return { status: 404, message };
  }
  if (/only an active administrator|can only|only.*own|administrator cannot/i.test(message)) {
    return { status: 403, message };
  }
  if (/required|must be|invalid|check|Select|damage|Loan period|Status|Decision/i.test(message)) {
    return { status: 400, message };
  }
  return { status: 500, message: 'Unexpected database error' };
}

module.exports = { pgError };
