export const SIMPLE_USER_I18N_DICT: Record<string, Record<string, string>> = {
  en: {
    user_not_found: 'User not found.',
    too_many_password_attempts:
      'Too many failed password attempts. Please wait before retrying.',
    invalid_password: 'Invalid password.',
    user_not_exist_provide_code:
      'User does not exist. Please provide code to create new user.',
    current_password_incorrect: 'Current password is incorrect.',
    send_code_cooldown: 'Please wait before requesting another code',
    too_many_code_attempts:
      'Too many invalid code attempts, please try again later',
    invalid_code: 'Invalid verification code',
  },
  zh: {
    user_not_found: '用户不存在。',
    too_many_password_attempts: '密码尝试次数过多，请稍后再试。',
    invalid_password: '密码错误。',
    user_not_exist_provide_code: '用户不存在，请提供验证码以创建新用户。',
    current_password_incorrect: '当前密码不正确。',
    send_code_cooldown: '请稍后再请求新的验证码',
    too_many_code_attempts: '验证码尝试次数过多，请稍后再试',
    invalid_code: '验证码无效',
  },
  'zh-Hant': {
    user_not_found: '使用者不存在。',
    too_many_password_attempts: '密碼嘗試次數過多，請稍後再試。',
    invalid_password: '密碼錯誤。',
    user_not_exist_provide_code: '使用者不存在，請提供驗證碼以建立新使用者。',
    current_password_incorrect: '目前密碼不正確。',
    send_code_cooldown: '請稍後再請求新的驗證碼',
    too_many_code_attempts: '驗證碼嘗試次數過多，請稍後再試',
    invalid_code: '驗證碼無效',
  },
  ja: {
    user_not_found: 'ユーザーが見つかりません。',
    too_many_password_attempts:
      'パスワードの試行回数が多すぎます。しばらくしてからやり直してください。',
    invalid_password: 'パスワードが正しくありません。',
    user_not_exist_provide_code:
      'ユーザーが存在しません。新規ユーザーを作成するにはコードを入力してください。',
    current_password_incorrect: '現在のパスワードが正しくありません。',
    send_code_cooldown: '新しいコードを要求する前にお待ちください',
    too_many_code_attempts:
      'コードの試行回数が多すぎます。しばらくしてからやり直してください',
    invalid_code: '無効な認証コード',
  },
  ko: {
    user_not_found: '사용자를 찾을 수 없습니다.',
    too_many_password_attempts:
      '비밀번호 시도 횟수가 너무 많습니다. 잠시 후 다시 시도해주세요.',
    invalid_password: '잘못된 비밀번호입니다.',
    user_not_exist_provide_code:
      '사용자가 존재하지 않습니다. 새 사용자를 만들려면 인증 코드를 입력해주세요.',
    current_password_incorrect: '현재 비밀번호가 올바르지 않습니다.',
    send_code_cooldown: '새 인증 코드를 요청하기 전에 잠시 기다려주세요',
    too_many_code_attempts:
      '인증 코드 시도 횟수가 너무 많습니다. 잠시 후 다시 시도해주세요',
    invalid_code: '유효하지 않은 인증 코드',
  },
  fr: {
    user_not_found: 'Utilisateur introuvable.',
    too_many_password_attempts:
      'Trop de tentatives de mot de passe échouées. Veuillez patienter avant de réessayer.',
    invalid_password: 'Mot de passe invalide.',
    user_not_exist_provide_code:
      "L'utilisateur n'existe pas. Veuillez fournir un code pour créer un nouvel utilisateur.",
    current_password_incorrect: 'Le mot de passe actuel est incorrect.',
    send_code_cooldown:
      'Veuillez patienter avant de demander un nouveau code',
    too_many_code_attempts:
      'Trop de tentatives de code invalides, veuillez réessayer plus tard',
    invalid_code: 'Code de vérification invalide',
  },
  de: {
    user_not_found: 'Benutzer nicht gefunden.',
    too_many_password_attempts:
      'Zu viele fehlgeschlagene Passwortversuche. Bitte warten Sie, bevor Sie es erneut versuchen.',
    invalid_password: 'Ungültiges Passwort.',
    user_not_exist_provide_code:
      'Benutzer existiert nicht. Bitte geben Sie einen Code ein, um einen neuen Benutzer zu erstellen.',
    current_password_incorrect: 'Das aktuelle Passwort ist falsch.',
    send_code_cooldown:
      'Bitte warten Sie, bevor Sie einen neuen Code anfordern',
    too_many_code_attempts:
      'Zu viele ungültige Code-Versuche, bitte versuchen Sie es später erneut',
    invalid_code: 'Ungültiger Bestätigungscode',
  },
  es: {
    user_not_found: 'Usuario no encontrado.',
    too_many_password_attempts:
      'Demasiados intentos fallidos de contraseña. Por favor, espere antes de reintentar.',
    invalid_password: 'Contraseña no válida.',
    user_not_exist_provide_code:
      'El usuario no existe. Por favor, proporcione un código para crear un nuevo usuario.',
    current_password_incorrect: 'La contraseña actual es incorrecta.',
    send_code_cooldown: 'Por favor, espere antes de solicitar otro código',
    too_many_code_attempts:
      'Demasiados intentos de código no válidos, por favor intente más tarde',
    invalid_code: 'Código de verificación no válido',
  },
  pt: {
    user_not_found: 'Usuário não encontrado.',
    too_many_password_attempts:
      'Muitas tentativas de senha falharam. Por favor, aguarde antes de tentar novamente.',
    invalid_password: 'Senha inválida.',
    user_not_exist_provide_code:
      'O usuário não existe. Por favor, forneça um código para criar um novo usuário.',
    current_password_incorrect: 'A senha atual está incorreta.',
    send_code_cooldown:
      'Por favor, aguarde antes de solicitar outro código',
    too_many_code_attempts:
      'Muitas tentativas de código inválidas, por favor tente novamente mais tarde',
    invalid_code: 'Código de verificação inválido',
  },
  ru: {
    user_not_found: 'Пользователь не найден.',
    too_many_password_attempts:
      'Слишком много неудачных попыток ввода пароля. Пожалуйста, подождите перед повторной попыткой.',
    invalid_password: 'Неверный пароль.',
    user_not_exist_provide_code:
      'Пользователь не существует. Пожалуйста, введите код для создания нового пользователя.',
    current_password_incorrect: 'Текущий пароль неверен.',
    send_code_cooldown:
      'Пожалуйста, подождите перед запросом нового кода',
    too_many_code_attempts:
      'Слишком много неудачных попыток ввода кода, пожалуйста, попробуйте позже',
    invalid_code: 'Недействительный код подтверждения',
  },
  ar: {
    user_not_found: 'المستخدم غير موجود.',
    too_many_password_attempts:
      'محاولات كلمة المرور الفاشلة كثيرة جداً. يرجى الانتظار قبل المحاولة مرة أخرى.',
    invalid_password: 'كلمة المرور غير صحيحة.',
    user_not_exist_provide_code:
      'المستخدم غير موجود. يرجى تقديم رمز التحقق لإنشاء مستخدم جديد.',
    current_password_incorrect: 'كلمة المرور الحالية غير صحيحة.',
    send_code_cooldown: 'يرجى الانتظار قبل طلب رمز جديد',
    too_many_code_attempts:
      'محاولات الرمز غير الصالحة كثيرة جداً، يرجى المحاولة لاحقاً',
    invalid_code: 'رمز التحقق غير صالح',
  },
  it: {
    user_not_found: 'Utente non trovato.',
    too_many_password_attempts:
      'Troppi tentativi di password falliti. Si prega di attendere prima di riprovare.',
    invalid_password: 'Password non valida.',
    user_not_exist_provide_code:
      "L'utente non esiste. Si prega di fornire un codice per creare un nuovo utente.",
    current_password_incorrect: 'La password attuale non è corretta.',
    send_code_cooldown:
      'Si prega di attendere prima di richiedere un nuovo codice',
    too_many_code_attempts:
      'Troppi tentativi di codice non validi, si prega di riprovare più tardi',
    invalid_code: 'Codice di verifica non valido',
  },
  th: {
    user_not_found: 'ไม่พบผู้ใช้',
    too_many_password_attempts:
      'พยายามใส่รหัสผ่านผิดมากเกินไป กรุณารอสักครู่แล้วลองใหม่',
    invalid_password: 'รหัสผ่านไม่ถูกต้อง',
    user_not_exist_provide_code:
      'ผู้ใช้ไม่มีอยู่ กรุณาใส่รหัสยืนยันเพื่อสร้างผู้ใช้ใหม่',
    current_password_incorrect: 'รหัสผ่านปัจจุบันไม่ถูกต้อง',
    send_code_cooldown: 'กรุณารอสักครู่ก่อนขอรหัสยืนยันใหม่',
    too_many_code_attempts:
      'พยายามใส่รหัสยืนยันผิดมากเกินไป กรุณาลองใหม่ภายหลัง',
    invalid_code: 'รหัสยืนยันไม่ถูกต้อง',
  },
  vi: {
    user_not_found: 'Không tìm thấy người dùng.',
    too_many_password_attempts:
      'Quá nhiều lần nhập mật khẩu sai. Vui lòng đợi trước khi thử lại.',
    invalid_password: 'Mật khẩu không đúng.',
    user_not_exist_provide_code:
      'Người dùng không tồn tại. Vui lòng cung cấp mã xác minh để tạo người dùng mới.',
    current_password_incorrect: 'Mật khẩu hiện tại không đúng.',
    send_code_cooldown: 'Vui lòng đợi trước khi yêu cầu mã mới',
    too_many_code_attempts:
      'Quá nhiều lần nhập mã không hợp lệ, vui lòng thử lại sau',
    invalid_code: 'Mã xác minh không hợp lệ',
  },
  tr: {
    user_not_found: 'Kullanıcı bulunamadı.',
    too_many_password_attempts:
      'Çok fazla başarısız şifre denemesi. Lütfen tekrar denemeden önce bekleyin.',
    invalid_password: 'Geçersiz şifre.',
    user_not_exist_provide_code:
      'Kullanıcı mevcut değil. Yeni kullanıcı oluşturmak için lütfen bir kod girin.',
    current_password_incorrect: 'Mevcut şifre yanlış.',
    send_code_cooldown: 'Yeni bir kod istemeden önce lütfen bekleyin',
    too_many_code_attempts:
      'Çok fazla geçersiz kod denemesi, lütfen daha sonra tekrar deneyin',
    invalid_code: 'Geçersiz doğrulama kodu',
  },
};

export const SIMPLE_USER_LOCALES = Object.keys(SIMPLE_USER_I18N_DICT);
