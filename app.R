# app.R
library(shiny)

ui <- fluidPage(
  # 1. 引入必要的 MediaPipe 库 (CDN)
  tags$head(
    tags$script(src = "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js", crossorigin="anonymous"),
    tags$script(src = "https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js", crossorigin="anonymous"),
    tags$script(src = "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js", crossorigin="anonymous"),
    tags$script(src = "https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js", crossorigin="anonymous"),
    
    # 2. 引入我们自己写的 CSS
    tags$link(rel = "stylesheet", type = "text/css", href = "style.css")
  ),
  
  # 3. 页面主体内容
  div(id = "container",
      h2("隔空手势画板", style="text-align:center; position:absolute; width:100%; top:0; z-index:10;"),
      
      div(id = "loading-msg", class = "loading-msg", "正在初始化 AI 模型..."),
      
      # 原始视频流 (将被CSS隐藏)
      tags$video(id = "input_video"),
      
      # 最终显示的画板
      tags$canvas(id = "output_canvas", width = "1280", height = "720")
  ),
  
  # 4. 引入我们自己写的 JS (必须放在 body 的最后，确保元素已加载)
  tags$script(src = "script.js")
)

server <- function(input, output, session) {
  # 由于所有图像处理都在浏览器端完成，服务器端不需要做任何事
}

shinyApp(ui, server)