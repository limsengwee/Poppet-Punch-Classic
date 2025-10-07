
export default {
  header: {
    credit: '积分',
    login_signup: '注册 / 登录',
    logout: '登出',
  },
  upload: {
    title: '上传你的小人',
    subtitle: '上传照片或使用摄像头拍摄，开始打小人吧!',
    button: '上传照片',
    mallet_ready: '基础锤子已可用 - 无需AI检测，直接开始游戏!',
  },
  camera: {
    button: '使用摄像头',
  },
  toolbox: {
    title: '工具箱',
    unlock_message: '所有工具已解锁! 尽情使用!',
  },
  strength: {
    label: '强度',
  },
  reset_effects: {
    button: '重置效果',
  },
  export: {
    button: '导出图片',
  },
  progress: {
    title: '进度统计',
    hits_label: '总计击打次数',
    progress_label: '进度',
    milestone_label: '下一个里程碑',
    milestone_first: '第一击',
  },
  restart: {
    button: '重新开始',
  },
  ai: {
    face_detection_inprogress: '正在检测人脸...',
    face_detection_failed_fallback: '未检测到人脸。已为整个图像启用互动。',
  },
  tools: {
    hand: '手掌',
    mallet: '木槌',
    blister: '水泡',
    spider: '巫毒蜘蛛',
    needle: '巫毒针',
    burn: '烧灼',
    classic: '经典打小人',
    phlegm: '粘痰',
    tornado: '龙卷风',
  },
  errors: {
    no_credits_guest: '积分用完了！请注册以获得100个新积分。',
    no_credits_user: '您的积分已用尽。',
  },
  auth: {
    title: '注册 / 登录',
    login_tab: '登录',
    signup_tab: '注册',
    username_label: '用户名',
    email_label: '电子邮件',
    password_label: '密码',
    login_button: '登录',
    signup_button: '注册并获得100积分',
    switch_to_signup: '还没有账户？ 注册',
    switch_to_login: '已有账户？ 登录',
    error_user_exists: '该电子邮件已存在账户。',
    error_not_found: '找不到使用此电子邮件的账户。',
    error_wrong_password: '密码错误。',
    error_short_password: '密码必须至少为6个字符。',
    error_required: '所有字段均为必填项。',
    error_invalid_email: '请输入有效的电子邮件地址。',
    error_generic: '发生意外错误。请重试。',
    divider_or: '或',
    google_signin: '使用谷歌登录',
    google_signin_unavailable: '谷歌登录未配置。请设置 VITE_GOOGLE_CLIENT_ID 环境变量以启用。',
  }
};