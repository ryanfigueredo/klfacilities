package com.kl.adm.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Business
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Store
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import kotlinx.coroutines.launch
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kl.adm.data.model.DiaRow
import com.kl.adm.data.model.FolhaPontoFuncionario
import com.kl.adm.data.model.GrupoResumo
import com.kl.adm.data.model.UnidadeResumo
import com.kl.adm.data.repository.PontoRepository
import com.kl.adm.ui.theme.KLBlue
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

enum class ViewMode {
    GRUPOS,
    UNIDADES,
    FUNCIONARIOS,
    HISTORICO
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PontosScreen(
    pontoRepository: PontoRepository,
    onBack: () -> Unit
) {
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var funcionarios by remember { mutableStateOf<List<FolhaPontoFuncionario>>(emptyList()) }
    var grupos by remember { mutableStateOf<List<GrupoResumo>>(emptyList()) }
    var unidades by remember { mutableStateOf<List<UnidadeResumo>>(emptyList()) }
    var month by remember { mutableStateOf(getCurrentMonth()) }
    
    var viewMode by remember { mutableStateOf(ViewMode.GRUPOS) }
    var grupoSelecionado by remember { mutableStateOf<GrupoResumo?>(null) }
    var unidadeSelecionada by remember { mutableStateOf<UnidadeResumo?>(null) }
    var funcionarioSelecionado by remember { mutableStateOf<FolhaPontoFuncionario?>(null) }
    var historico by remember { mutableStateOf<List<DiaRow>>(emptyList()) }
    var loadingHistorico by remember { mutableStateOf(false) }
    
    // Estados para dialog de adicionar ponto
    var showAddPontoDialog by remember { mutableStateOf(false) }
    var tipoPonto by remember { mutableStateOf("ENTRADA") }
    var dataPonto by remember { mutableStateOf(TextFieldValue(getCurrentDate())) }
    var horaPonto by remember { mutableStateOf(TextFieldValue(getCurrentTime())) }
    var observacaoPonto by remember { mutableStateOf(TextFieldValue("")) }
    var salvandoPonto by remember { mutableStateOf(false) }
    
    val coroutineScope = rememberCoroutineScope()
    
    fun handleAdicionarPonto() {
        if (funcionarioSelecionado == null) return
        val timestamp = formatarTimestamp(dataPonto.text, horaPonto.text)
        val obs = observacaoPonto.text.ifBlank { "Ajuste manual via aplicativo mobile" }
        
        salvandoPonto = true
        coroutineScope.launch {
            pontoRepository.adicionarPonto(
                funcionarioSelecionado!!.id,
                tipoPonto,
                timestamp,
                obs
            ).onSuccess {
                showAddPontoDialog = false
                // Recarregar histórico se estiver na tela de histórico
                if (viewMode == ViewMode.HISTORICO && funcionarioSelecionado?.cpf != null) {
                    pontoRepository.historico(funcionarioSelecionado!!.cpf!!, month)
                        .onSuccess { resp -> historico = resp.table }
                }
                // Resetar campos
                dataPonto = TextFieldValue(getCurrentDate())
                horaPonto = TextFieldValue(getCurrentTime())
                observacaoPonto = TextFieldValue("")
                salvandoPonto = false
            }.onFailure {
                salvandoPonto = false
                error = it.message ?: "Erro ao adicionar ponto"
            }
        }
    }

    LaunchedEffect(month) {
        loading = true
        pontoRepository.folhas(unidadeId = null, month = month)
            .onSuccess { resp ->
                funcionarios = resp.funcionarios
                grupos = resp.grupos
                unidades = resp.unidades
                error = null
            }
            .onFailure { 
                error = it.message ?: "Erro ao carregar folhas"
            }
        loading = false
    }

    LaunchedEffect(funcionarioSelecionado, month) {
        funcionarioSelecionado?.let { func ->
            if (viewMode == ViewMode.HISTORICO && func.cpf != null) {
                loadingHistorico = true
                pontoRepository.historico(func.cpf, month)
                    .onSuccess { resp ->
                        historico = resp.table
                    }
                    .onFailure {
                        historico = emptyList()
                    }
                loadingHistorico = false
            }
        }
    }

    fun handleGrupoClick(grupo: GrupoResumo) {
        grupoSelecionado = grupo
        unidadeSelecionada = null
        funcionarioSelecionado = null
        viewMode = ViewMode.UNIDADES
    }

    fun handleUnidadeClick(unidade: UnidadeResumo) {
        unidadeSelecionada = unidade
        funcionarioSelecionado = null
        viewMode = ViewMode.FUNCIONARIOS
    }

    fun handleFuncionarioClick(func: FolhaPontoFuncionario) {
        funcionarioSelecionado = func
        viewMode = ViewMode.HISTORICO
    }

    fun handleBack() {
        when (viewMode) {
            ViewMode.HISTORICO -> {
                funcionarioSelecionado = null
                viewMode = ViewMode.FUNCIONARIOS
            }
            ViewMode.FUNCIONARIOS -> {
                unidadeSelecionada = null
                viewMode = ViewMode.UNIDADES
            }
            ViewMode.UNIDADES -> {
                grupoSelecionado = null
                viewMode = ViewMode.GRUPOS
            }
            ViewMode.GRUPOS -> onBack()
        }
    }

    fun changeMonth(direction: Int) {
        val (year, monthNum) = month.split("-").map { it.toInt() }
        val cal = Calendar.getInstance()
        cal.set(year, monthNum - 1, 1)
        cal.add(Calendar.MONTH, direction)
        month = SimpleDateFormat("yyyy-MM", Locale.getDefault()).format(cal.time)
    }

    val funcionariosPorGrupo = funcionarios.groupBy { it.grupoId ?: "" }
        .mapNotNull { (grupoId, funcs) ->
            grupos.find { it.id == grupoId }?.let { grupo ->
                grupo to funcs
            }
        }

    val funcionariosPorUnidade = grupoSelecionado?.let { grupo ->
        funcionarios.filter { it.grupoId == grupo.id }
            .groupBy { it.unidadeId ?: "" }
            .mapNotNull { (unidadeId, funcs) ->
                unidades.find { it.id == unidadeId }?.let { unidade ->
                    unidade to funcs
                }
            }
    } ?: emptyList()

    val funcionariosDaLoja = unidadeSelecionada?.let { unidade ->
        funcionarios.filter { it.unidadeId == unidade.id }
    } ?: emptyList()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { 
                    Text(
                        when (viewMode) {
                            ViewMode.GRUPOS -> "Pontos"
                            ViewMode.UNIDADES -> grupoSelecionado?.nome ?: "Pontos"
                            ViewMode.FUNCIONARIOS -> unidadeSelecionada?.nome ?: "Pontos"
                            ViewMode.HISTORICO -> funcionarioSelecionado?.nome ?: "Histórico"
                        }
                    )
                },
                navigationIcon = {
                    IconButton(onClick = { handleBack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Voltar")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = KLBlue,
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.surface)
                .padding(padding)
        ) {
            when {
                loading -> {
                    Column(
                        modifier = Modifier.fillMaxSize(),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        CircularProgressIndicator(color = KLBlue)
                        Spacer(modifier = Modifier.height(16.dp))
                        Text("Carregando...")
                    }
                }
                error != null -> {
                    Column(
                        modifier = Modifier.fillMaxSize(),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(error!!, color = MaterialTheme.colorScheme.error)
                    }
                }
                else -> {
                    Column(modifier = Modifier.fillMaxSize()) {
                        // Seletor de mês (não mostrar no histórico)
                        if (viewMode != ViewMode.HISTORICO) {
                            MonthSelector(
                                month = month,
                                onPrev = { changeMonth(-1) },
                                onNext = { changeMonth(1) }
                            )
                        }

                        when (viewMode) {
                            ViewMode.GRUPOS -> {
                                GruposList(
                                    grupos = funcionariosPorGrupo,
                                    onGrupoClick = { grupo, _ -> handleGrupoClick(grupo) }
                                )
                            }
                            ViewMode.UNIDADES -> {
                                UnidadesList(
                                    unidades = funcionariosPorUnidade,
                                    onUnidadeClick = { unidade, _ -> handleUnidadeClick(unidade) }
                                )
                            }
                            ViewMode.FUNCIONARIOS -> {
                                FuncionariosList(
                                    funcionarios = funcionariosDaLoja,
                                    onFuncionarioClick = { func -> handleFuncionarioClick(func) },
                                    onAddPonto = { func ->
                                        funcionarioSelecionado = func
                                        showAddPontoDialog = true
                                    }
                                )
                            }
                            ViewMode.HISTORICO -> {
                                HistoricoView(
                                    funcionario = funcionarioSelecionado!!,
                                    historico = historico,
                                    month = month,
                                    loading = loadingHistorico,
                                    onAddPonto = {
                                        showAddPontoDialog = true
                                    },
                                    onMonthChange = { direction -> changeMonth(direction) }
                                )
                            }
                        }
                    }
                }
            }
        }
        
        // Dialog de adicionar ponto
        if (showAddPontoDialog && funcionarioSelecionado != null) {
            AddPontoDialog(
                funcionario = funcionarioSelecionado!!,
                tipo = tipoPonto,
                data = dataPonto,
                hora = horaPonto,
                observacao = observacaoPonto,
                loading = salvandoPonto,
                onTipoChange = { tipoPonto = it },
                onDataChange = { dataPonto = it },
                onHoraChange = { horaPonto = it },
                onObservacaoChange = { observacaoPonto = it },
                onSalvar = { handleAdicionarPonto() },
                onCancel = {
                    showAddPontoDialog = false
                }
            )
        }
    }
}

@Composable
fun MonthSelector(
    month: String,
    onPrev: () -> Unit,
    onNext: () -> Unit
) {
    val monthNames = listOf(
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    )
    val (year, monthNum) = month.split("-").map { it.toInt() }
    val monthName = monthNames[monthNum - 1]

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color(0xFFF5F5F5))
            .padding(16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        TextButton(onClick = onPrev) {
            Text("‹", fontSize = 24.sp, fontWeight = FontWeight.Bold)
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                Icons.Filled.CalendarMonth,
                contentDescription = null,
                tint = KLBlue,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                "$monthName de $year",
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold,
                color = Color(0xFF333333)
            )
        }
        TextButton(onClick = onNext) {
            Text("›", fontSize = 24.sp, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
fun GruposList(
    grupos: List<Pair<GrupoResumo, List<FolhaPontoFuncionario>>>,
    onGrupoClick: (GrupoResumo, List<FolhaPontoFuncionario>) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(grupos) { (grupo, funcs) ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onGrupoClick(grupo, funcs) },
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Filled.Business,
                        contentDescription = null,
                        tint = Color(0xFF666666),
                        modifier = Modifier.size(32.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            grupo.nome,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            "${funcs.size} funcionário${if (funcs.size != 1) "s" else ""}",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFF666666)
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun UnidadesList(
    unidades: List<Pair<UnidadeResumo, List<FolhaPontoFuncionario>>>,
    onUnidadeClick: (UnidadeResumo, List<FolhaPontoFuncionario>) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(unidades) { (unidade, funcs) ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onUnidadeClick(unidade, funcs) },
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Filled.Store,
                        contentDescription = null,
                        tint = Color(0xFF666666),
                        modifier = Modifier.size(28.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            unidade.nome,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            "${funcs.size} funcionário${if (funcs.size != 1) "s" else ""}",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFF666666)
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun FuncionariosList(
    funcionarios: List<FolhaPontoFuncionario>,
    onFuncionarioClick: (FolhaPontoFuncionario) -> Unit,
    onAddPonto: (FolhaPontoFuncionario) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(funcionarios) { func ->
            val temProblema = func.batidas?.let { batidas ->
                batidas.entrada > batidas.saida || batidas.intervaloInicio > batidas.intervaloFim
            } ?: false

            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onFuncionarioClick(func) },
                colors = CardDefaults.cardColors(
                    containerColor = if (temProblema) Color(0xFFFFF5F5) else MaterialTheme.colorScheme.surface
                ),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(48.dp)
                            .background(
                                if (temProblema) Color(0xFFF44336) else Color(0xFFF5F5F5),
                                RoundedCornerShape(24.dp)
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Filled.Person,
                            contentDescription = null,
                            tint = if (temProblema) Color.White else Color(0xFF666666),
                            modifier = Modifier.size(24.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                func.nome,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.SemiBold
                            )
                            if (temProblema) {
                                Spacer(modifier = Modifier.width(8.dp))
                                Icon(
                                    Icons.Filled.Warning,
                                    contentDescription = null,
                                    tint = Color(0xFFF44336),
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }
                        func.cpf?.let {
                            Text(
                                "CPF: $it",
                                style = MaterialTheme.typography.bodySmall,
                                color = Color(0xFF666666)
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun HistoricoView(
    funcionario: FolhaPontoFuncionario,
    historico: List<DiaRow>,
    month: String,
    loading: Boolean,
    onAddPonto: () -> Unit,
    onMonthChange: (Int) -> Unit
) {
    Column(modifier = Modifier.fillMaxSize()) {
        // Botão adicionar ponto
        Button(
            onClick = onAddPonto,
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = KLBlue)
        ) {
            Icon(Icons.Filled.Add, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text("Adicionar Batida")
        }

        // Seletor de mês para histórico
        MonthSelector(
            month = month,
            onPrev = { onMonthChange(-1) },
            onNext = { onMonthChange(1) }
        )

        if (loading) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    CircularProgressIndicator(color = KLBlue)
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("Carregando histórico...")
                }
            }
        } else {
            Column(modifier = Modifier.fillMaxSize()) {
                // Cabeçalho da tabela
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(KLBlue)
                        .padding(vertical = 12.dp, horizontal = 8.dp)
                ) {
                    Text(
                        "Dia",
                        modifier = Modifier.weight(0.8f),
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        textAlign = TextAlign.Center
                    )
                    Text(
                        "Semana",
                        modifier = Modifier.weight(0.8f),
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        textAlign = TextAlign.Center
                    )
                    Text(
                        "Entrada",
                        modifier = Modifier.weight(1f),
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        textAlign = TextAlign.Center
                    )
                    Text(
                        "Saída",
                        modifier = Modifier.weight(1f),
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        textAlign = TextAlign.Center
                    )
                    Text(
                        "Início Int.",
                        modifier = Modifier.weight(1f),
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        textAlign = TextAlign.Center
                    )
                    Text(
                        "Fim Int.",
                        modifier = Modifier.weight(1f),
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        textAlign = TextAlign.Center
                    )
                    Text(
                        "Total",
                        modifier = Modifier.weight(1f),
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        textAlign = TextAlign.Center
                    )
                }

                // Linhas da tabela
                LazyColumn(
                    modifier = Modifier.fillMaxSize()
                ) {
                    itemsIndexed(historico) { index, row ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(
                                    if (index % 2 == 0) Color(0xFFF9F9F9) else MaterialTheme.colorScheme.surface
                                )
                                .padding(vertical = 10.dp, horizontal = 8.dp)
                        ) {
                            Text(
                                row.dia.toString(),
                                modifier = Modifier.weight(0.8f),
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                                textAlign = TextAlign.Center
                            )
                            Text(
                                row.semana,
                                modifier = Modifier.weight(0.8f),
                                fontSize = 13.sp,
                                textAlign = TextAlign.Center
                            )
                            Text(
                                row.entrada ?: "—",
                                modifier = Modifier.weight(1f),
                                fontSize = 13.sp,
                                textAlign = TextAlign.Center
                            )
                            Text(
                                row.saida ?: "—",
                                modifier = Modifier.weight(1f),
                                fontSize = 13.sp,
                                textAlign = TextAlign.Center
                            )
                            Text(
                                row.intervaloInicio ?: "—",
                                modifier = Modifier.weight(1f),
                                fontSize = 13.sp,
                                textAlign = TextAlign.Center
                            )
                            Text(
                                row.intervaloFim ?: "—",
                                modifier = Modifier.weight(1f),
                                fontSize = 13.sp,
                                textAlign = TextAlign.Center
                            )
                            Text(
                                row.totalHoras ?: "—",
                                modifier = Modifier.weight(1f),
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                                textAlign = TextAlign.Center
                            )
                        }
                    }

                    // Linha de total do mês
                    if (historico.isNotEmpty()) {
                        item {
                            val totalHoras = historico.sumOf { it.totalMinutos } / 60
                            val totalMinutos = historico.sumOf { it.totalMinutos } % 60
                            
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(KLBlue)
                                    .padding(16.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    "Total do Mês:",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                                Text(
                                    "${totalHoras}h ${totalMinutos}min",
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            }
                        }
                    }

                    // Mensagem quando não há registros
                    if (historico.isEmpty()) {
                        item {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(40.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    "Nenhum registro de ponto encontrado para este mês.",
                                    fontSize = 16.sp,
                                    color = Color(0xFF666666),
                                    textAlign = TextAlign.Center
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

fun getCurrentMonth(): String {
    val cal = Calendar.getInstance()
    val year = cal.get(Calendar.YEAR)
    val month = cal.get(Calendar.MONTH) + 1
    return String.format("%04d-%02d", year, month)
}

fun getCurrentDate(): String {
    val cal = Calendar.getInstance()
    val year = cal.get(Calendar.YEAR)
    val month = cal.get(Calendar.MONTH) + 1
    val day = cal.get(Calendar.DAY_OF_MONTH)
    return String.format("%04d-%02d-%02d", year, month, day)
}

fun getCurrentTime(): String {
    val cal = Calendar.getInstance()
    val hour = cal.get(Calendar.HOUR_OF_DAY)
    val minute = cal.get(Calendar.MINUTE)
    return String.format("%02d:%02d", hour, minute)
}

fun formatarTimestamp(data: String, hora: String): String {
    // Formato: YYYY-MM-DDTHH:mm:ss+HH:mm (ISO 8601 com timezone)
    val cal = Calendar.getInstance()
    val (year, month, day) = data.split("-").map { it.toInt() }
    val (hour, minute) = hora.split(":").map { it.toInt() }
    cal.set(year, month - 1, day, hour, minute, 0)
    
    val offset = cal.get(Calendar.ZONE_OFFSET) + cal.get(Calendar.DST_OFFSET)
    val offsetHours = offset / (1000 * 60 * 60)
    val offsetMinutes = (offset / (1000 * 60)) % 60
    val sign = if (offsetHours >= 0) "+" else "-"
    
    return String.format(
        "%04d-%02d-%02dT%02d:%02d:00%s%02d:%02d",
        year, month, day, hour, minute, sign, Math.abs(offsetHours), offsetMinutes
    )
}

@Composable
fun AddPontoDialog(
    funcionario: FolhaPontoFuncionario,
    tipo: String,
    data: TextFieldValue,
    hora: TextFieldValue,
    observacao: TextFieldValue,
    loading: Boolean,
    onTipoChange: (String) -> Unit,
    onDataChange: (TextFieldValue) -> Unit,
    onHoraChange: (TextFieldValue) -> Unit,
    onObservacaoChange: (TextFieldValue) -> Unit,
    onSalvar: () -> Unit,
    onCancel: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onCancel,
        title = { Text("Adicionar Batida") },
        text = {
            Column {
                Text("Funcionário: ${funcionario.nome}", fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(16.dp))
                
                Text("Tipo", fontWeight = FontWeight.SemiBold)
                Row {
                    listOf("ENTRADA", "SAIDA", "INTERVALO_INICIO", "INTERVALO_FIM").forEach { t ->
                        TextButton(
                            onClick = { onTipoChange(t) },
                            colors = androidx.compose.material3.ButtonDefaults.textButtonColors(
                                contentColor = if (tipo == t) KLBlue else Color.Gray
                            )
                        ) {
                            Text(t)
                        }
                    }
                }
                
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = data,
                    onValueChange = onDataChange,
                    label = { Text("Data (YYYY-MM-DD)") },
                    modifier = Modifier.fillMaxWidth()
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = hora,
                    onValueChange = onHoraChange,
                    label = { Text("Hora (HH:mm)") },
                    modifier = Modifier.fillMaxWidth()
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = observacao,
                    onValueChange = onObservacaoChange,
                    label = { Text("Observação") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 2,
                    maxLines = 4
                )
            }
        },
        confirmButton = {
            Button(
                onClick = onSalvar,
                enabled = !loading && data.text.isNotBlank() && hora.text.isNotBlank(),
                colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = KLBlue)
            ) {
                if (loading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(16.dp),
                        color = Color.White
                    )
                } else {
                    Text("Salvar")
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onCancel) {
                Text("Cancelar")
            }
        }
    )
}
