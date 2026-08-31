@echo off
title Sistema Transportadora - SERVIDOR (nao feche esta janela)
cd /d "%~dp0"
echo ============================================================
echo   SISTEMA DA TRANSPORTADORA  (modo rapido / producao)
echo ------------------------------------------------------------
echo   Iniciando o servidor... aguarde aparecer "Ready".
echo   Depois abra no navegador:  http://localhost:3000
echo.
echo   NAO FECHE esta janela enquanto estiver usando o sistema.
echo   Para PARAR: feche esta janela ou aperte Ctrl + C.
echo.
echo   (Se aparecer "porta 3000 em uso", o sistema JA esta no ar
echo    - e so abrir http://localhost:3000 no navegador.)
echo ============================================================
echo.
call npm start
echo.
echo O servidor parou. Pode fechar esta janela.
pause
