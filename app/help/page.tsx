import Link from "next/link";
import { requireSession } from "@/lib/dal";
import { SHOP_CATEGORY_NAME } from "@/lib/categories";
import { PASSWORD_MIN_LENGTH } from "@/lib/validation";
import { LOW_STOCK } from "@/lib/reports/definitions";
import { Page } from "@/components/page";
import { Eyebrow } from "@/components/eyebrow";
import { cardClass, linkClass } from "@/components/styles";

// The user guide: how to find your way around and do the everyday tasks.
// Written for the volunteers who use the app, so it names screens, buttons and
// fields exactly as they appear on screen.

const TOPICS = [
  { id: "visao-geral", title: "Como o sistema funciona" },
  { id: "primeiros-passos", title: "Primeiros passos" },
  { id: "painel", title: "Painel" },
  { id: "transacoes", title: "Transações" },
  { id: "lojinha", title: "Lojinha: vendas e parcelas" },
  { id: "estoque", title: "Estoque" },
  { id: "bandeirantes", title: "Bandeirantes" },
  { id: "relatorios", title: "Relatórios" },
  { id: "categorias", title: "Categorias" },
  { id: "usuarios", title: "Usuários e senhas" },
  { id: "duvidas", title: "Dúvidas comuns" },
] as const;

type TopicId = (typeof TOPICS)[number]["id"];

export default async function HelpPage() {
  await requireSession();

  return (
    <Page title="Ajuda">
      <p className="max-w-2xl font-serif text-[17px] leading-relaxed text-muted">
        Um guia rápido de cada tela do Baú Financeiro e das tarefas do dia a
        dia. Os nomes em <Ui>destaque</Ui> são os botões e campos que aparecem
        na tela.
      </p>

      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
        <nav aria-label="Tópicos da ajuda" className="flex flex-col gap-3 lg:sticky lg:top-24">
          <Eyebrow as="h2" tone="ink">
            Nesta página
          </Eyebrow>
          <ol className="flex flex-col gap-2 text-[15px]">
            {TOPICS.map((topic) => (
              <li key={topic.id}>
                <a href={`#${topic.id}`} className="text-muted hover:text-ink">
                  {topic.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="flex min-w-0 flex-col gap-12">
          <Topic id="visao-geral">
            <P>
              O Baú Financeiro é o caixa da organização. Todo dinheiro que entra
              ou sai vira uma <Term>transação</Term>, e o saldo é sempre a soma
              delas. Por isso, mesmo quando o registro começa em outra tela (uma
              parcela paga na Lojinha, uma compra de mercadoria no Estoque), a
              transação correspondente é criada sozinha.
            </P>
            <ul className="flex flex-col gap-3 font-serif text-[17px] leading-relaxed">
              <Li>
                <Term>Entrada</Term>: dinheiro que chegou (doação, contribuição
                mensal, cantina, parcela de uma venda).
              </Li>
              <Li>
                <Term>Saída</Term>: dinheiro que foi gasto (fornecedores,
                aluguel, compra de mercadoria).
              </Li>
              <Li>
                <Term>Categoria</Term>: de onde veio ou para onde foi o
                dinheiro. É o que organiza o Painel e os Relatórios.
              </Li>
              <Li>
                <Term>Bandeirante</Term>: quem compra na Lojinha ou paga a
                contribuição mensal.
              </Li>
              <Li>
                <Term>Parcela</Term>: cada pagamento mensal de uma venda. A
                venda pode ser paga de uma vez ou em até 24 parcelas.
              </Li>
            </ul>
            <P>
              O menu no topo leva a todas as telas. No canto direito ficam a
              escolha de tema (do sistema, claro ou escuro), esta{" "}
              <Ui>Ajuda</Ui> e o botão <Ui>Sair</Ui>.
            </P>
          </Topic>

          <Topic id="primeiros-passos">
            <P>
              Se o sistema ainda está vazio, esta ordem evita voltar atrás:
            </P>
            <Steps>
              <li>
                Confira as <ScreenLink href="/categories">Categorias</ScreenLink>{" "}
                e crie as que faltarem.
              </li>
              <li>
                Cadastre os{" "}
                <ScreenLink href="/kids">Bandeirantes</ScreenLink>. Dá para
                cadastrar também na hora da venda, mas com o cadastro feito antes
                o telefone do responsável já aparece nos relatórios de cobrança.
              </li>
              <li>
                Cadastre os itens do{" "}
                <ScreenLink href="/inventory">Estoque</ScreenLink> com a
                quantidade que já existe guardada.
              </li>
              <li>
                Registre as vendas na{" "}
                <ScreenLink href="/sales">Lojinha</ScreenLink> e o restante do
                dinheiro em{" "}
                <ScreenLink href="/entries">Transações</ScreenLink>.
              </li>
              <li>
                Acompanhe tudo no <ScreenLink href="/dashboard">Painel</ScreenLink>{" "}
                e gere planilhas em{" "}
                <ScreenLink href="/reports">Relatórios</ScreenLink>.
              </li>
            </Steps>
          </Topic>

          <Topic id="painel" screen="/dashboard">
            <P>
              A primeira tela depois do login. Mostra o resumo de todo o
              histórico:
            </P>
            <ul className="flex flex-col gap-3 font-serif text-[17px] leading-relaxed">
              <Li>
                <Term>Entrou</Term>, <Term>Saiu</Term> e <Term>Saldo</Term>: o
                total de entradas, de saídas e a diferença entre elas.
              </Li>
              <Li>
                <Term>A receber em parcelas</Term>: o que ainda falta receber
                das vendas. <Term>Parcelas atrasadas</Term>: a parte disso que já
                passou do vencimento.
              </Li>
              <Li>
                Quando há parcelas atrasadas, aparece a lista delas com quem
                deve, o item e o valor. Clique em <Ui>Ver</Ui> para abrir a venda
                e registrar o pagamento.
              </Li>
              <Li>
                <Term>Por origem</Term> soma o que entrou e saiu em cada
                categoria, e <Term>Por mês</Term> mostra o saldo de cada mês.
              </Li>
            </ul>
          </Topic>

          <Topic id="transacoes" screen="/entries">
            <P>
              A lista de tudo que entrou e saiu, da mais recente para a mais
              antiga.
            </P>
            <Task title="Registrar uma doação, despesa ou contribuição">
              <Steps>
                <li>
                  Clique em <Ui>Nova transação</Ui>.
                </li>
                <li>
                  Escolha o <Ui>Tipo</Ui>: <Ui>Entrada</Ui> ou <Ui>Saída</Ui>.
                </li>
                <li>
                  Preencha <Ui>Valor (R$)</Ui>, <Ui>Data</Ui> e{" "}
                  <Ui>Categoria</Ui>.
                </li>
                <li>
                  Informe <Ui>Quem pagou</Ui> (entrada) ou{" "}
                  <Ui>Fornecedor</Ui> (saída), se quiser. Em categorias que
                  exigem bandeirante, como a contribuição mensal, escolha o{" "}
                  <Ui>Bandeirante</Ui> no lugar.
                </li>
                <li>
                  Clique em <Ui>Adicionar</Ui>.
                </li>
              </Steps>
            </Task>
            <P>
              Use <Ui>Editar</Ui> para corrigir uma transação e{" "}
              <Ui>Excluir</Ui> para apagá-la. A exclusão não tem volta.
            </P>
            <Note>
              Transações criadas pela Lojinha (parcelas pagas) ou pelo Estoque
              (compra de mercadoria) mostram <Ui>Ver venda</Ui> ou{" "}
              <Ui>Ver estoque</Ui> no lugar de Editar. Corrija pela tela de
              origem, assim a venda ou o estoque ficam certos também.
            </Note>
            <Note>
              A categoria {SHOP_CATEGORY_NAME} não aparece em Nova transação:
              vendas de itens são registradas pela Lojinha, que também baixa o
              estoque.
            </Note>
          </Topic>

          <Topic id="lojinha" screen="/sales">
            <P>
              Onde ficam as vendas de itens do estoque para os bandeirantes. A
              lista mostra cada venda com o total e quantas parcelas já foram
              pagas.
            </P>
            <Task title="Registrar uma venda">
              <Steps>
                <li>
                  Clique em <Ui>Nova venda</Ui>.
                </li>
                <li>
                  Escolha o <Ui>Bandeirante</Ui>. Se a pessoa ainda não tem
                  cadastro, escolha <Ui>Outro (não cadastrado)</Ui> e preencha o
                  nome: o cadastro é criado junto com a venda.
                </li>
                <li>
                  Escolha o <Ui>Item</Ui> e a <Ui>Quantidade</Ui>. O preço vem do
                  estoque, mas pode ser mudado em <Ui>Preço unitário (R$)</Ui>.
                </li>
                <li>
                  Em <Ui>Parcelas</Ui>, informe em quantas vezes será pago (1 para
                  à vista) e o <Ui>Vencimento da 1ª parcela</Ui>. As seguintes
                  vencem no mesmo dia dos meses seguintes, e o resumo mostra o
                  valor e a data de cada uma.
                </li>
                <li>
                  Clique em <Ui>Registrar venda</Ui>. As unidades saem do estoque
                  na hora.
                </li>
              </Steps>
            </Task>
            <Task title="Receber uma parcela">
              <Steps>
                <li>
                  Abra a venda (<Ui>Ver</Ui> na lista, no Painel ou na página do
                  bandeirante).
                </li>
                <li>
                  Na parcela, confira a data do pagamento e clique em{" "}
                  <Ui>Marcar como paga</Ui>.
                </li>
              </Steps>
              <P>
                A entrada é registrada em Transações automaticamente. Se marcou
                a parcela errada, use <Ui>Desfazer</Ui>: a entrada é apagada e a
                parcela volta a ficar em aberto.
              </P>
            </Task>
            <Note>
              <Ui>Excluir venda</Ui> devolve as unidades ao estoque e apaga das
              transações as parcelas que já tinham sido pagas.
            </Note>
          </Topic>

          <Topic id="estoque" screen="/inventory">
            <P>
              Os itens que a Lojinha vende e quantas unidades há de cada um.
              Também serve para serviços, como o aluguel da van, que não têm
              quantidade guardada.
            </P>
            <Task title="Cadastrar um item">
              <Steps>
                <li>
                  Clique em <Ui>Novo item</Ui> e preencha <Ui>Nome</Ui> e{" "}
                  <Ui>Preço de venda (R$)</Ui>.
                </li>
                <li>
                  Deixe <Ui>Controlar estoque</Ui> marcado para produtos e
                  informe a <Ui>Quantidade inicial em estoque</Ui>. Desmarque para
                  serviços.
                </li>
                <li>
                  Se a organização pagou pela mercadoria, informe o{" "}
                  <Ui>Valor da mercadoria (R$)</Ui>: a saída é registrada nas
                  transações. Deixe em branco para itens doados.
                </li>
                <li>
                  Clique em <Ui>Adicionar</Ui>.
                </li>
              </Steps>
            </Task>
            <Task title="Repor ou corrigir o estoque">
              <P>
                Abra o item com <Ui>Ver</Ui> e use <Ui>Movimentar estoque</Ui>:
              </P>
              <ul className="flex flex-col gap-3 font-serif text-[17px] leading-relaxed">
                <Li>
                  <Ui>Reposição</Ui>: chegaram mais unidades. Informe o{" "}
                  <Ui>Valor pago (R$)</Ui> se houve compra, e a saída vai para as
                  transações.
                </Li>
                <Li>
                  <Ui>Ajuste</Ui>: para corrigir a contagem. Use número negativo
                  para retirar unidades (ex.: -2 perdidos).
                </Li>
              </ul>
              <P>
                O <Term>Histórico do estoque</Term> mostra cada entrada e saída
                de unidades, incluindo as vendas. Em <Ui>Dados do item</Ui> dá
                para mudar o nome e o preço.
              </P>
            </Task>
            <Note>
              Um item só pode ser excluído enquanto não tiver vendas. A
              quantidade fica em vermelho quando o item está esgotado.
            </Note>
          </Topic>

          <Topic id="bandeirantes" screen="/kids">
            <P>
              O cadastro de quem compra na Lojinha e paga contribuições. A
              coluna <Term>A pagar</Term> mostra quanto cada um ainda deve em
              parcelas.
            </P>
            <Task title="Cadastrar um bandeirante">
              <Steps>
                <li>
                  Clique em <Ui>Novo bandeirante</Ui> e preencha o <Ui>Nome</Ui>.
                  <Ui>Contato</Ui> e <Ui>Ramo</Ui> são opcionais.
                </li>
                <li>
                  Para quem tem menos de 18 anos, marque{" "}
                  <Ui>Menor de idade</Ui> e informe o nome e o telefone do
                  responsável.
                </li>
                <li>
                  Clique em <Ui>Adicionar</Ui>.
                </li>
              </Steps>
            </Task>
            <P>
              Clique em <Ui>Ver</Ui> para abrir a página do bandeirante, com
              suas vendas, contribuições e dados de contato. O botão{" "}
              <Ui>Nova venda</Ui> ali já vem com o bandeirante escolhido.
            </P>
            <Note>
              Só dá para excluir um bandeirante que não tem vendas nem
              contribuições registradas.
            </Note>
          </Topic>

          <Topic id="relatorios" screen="/reports">
            <P>
              Gera planilhas do Excel para prestação de contas, cobrança e
              controle. A prévia na tela mostra o resultado antes de baixar.
            </P>
            <Task title="Gerar uma planilha">
              <Steps>
                <li>
                  Escolha o tipo de relatório: <Term>Transações</Term>,{" "}
                  <Term>Parcelas</Term>, <Term>Vendas da Lojinha</Term> ou{" "}
                  <Term>Estoque</Term>.
                </li>
                <li>
                  Em <Ui>Filtros</Ui>, escolha o período e o que mais quiser
                  restringir (categoria, bandeirante, item, situação da
                  parcela...).
                </li>
                <li>
                  Em <Ui>Organizar planilha</Ui>, escolha como{" "}
                  <Ui>Agrupar por</Ui> e quais <Ui>Colunas</Ui> incluir. Dá para
                  adicionar uma aba de resumo com os totais ou uma aba para cada
                  grupo.
                </li>
                <li>
                  Clique em <Ui>Baixar Excel</Ui>. A planilha sempre traz todas as
                  linhas, mesmo quando a prévia mostra só as primeiras.
                </li>
              </Steps>
            </Task>
            <Task title="Modelos salvos">
              <P>
                Os <Term>Modelos salvos</Term> guardam filtros usados com
                frequência, como a prestação de contas mensal ou a cobrança de
                parcelas atrasadas. Clique em um modelo para abri-lo. Para criar o
                seu, monte os filtros e clique em <Ui>Salvar modelo</Ui>.
              </P>
              <P>
                <Ui>Copiar link deste relatório</Ui> copia um endereço que abre o
                mesmo relatório para outra pessoa com acesso ao sistema.
              </P>
            </Task>
            <Note>
              No relatório de Estoque, <Term>Acabando</Term> são os itens com{" "}
              {LOW_STOCK} unidades ou menos.
            </Note>
          </Topic>

          <Topic id="categorias" screen="/categories">
            <P>
              Para criar uma categoria, digite o nome em{" "}
              <Ui>Nova categoria</Ui> e clique em <Ui>Adicionar</Ui>. Use{" "}
              <Ui>Renomear</Ui> para mudar o nome; as transações antigas passam
              a mostrar o nome novo.
            </P>
            <P>Cada categoria tem duas opções:</P>
            <ul className="flex flex-col gap-3 font-serif text-[17px] leading-relaxed">
              <Li>
                <Ui>Exige bandeirante</Ui>: a transação precisa dizer de qual
                bandeirante veio o dinheiro, como na contribuição mensal. Assim
                ela aparece na página do bandeirante.
              </Li>
              <Li>
                <Ui>Só pela tela Lojinha</Ui>: a categoria some de Nova
                transação, para que toda venda passe pela Lojinha e atualize o
                estoque.
              </Li>
            </ul>
            <Note>
              Uma categoria só pode ser excluída quando não está em uso. A
              categoria {SHOP_CATEGORY_NAME} é a dos itens do estoque e não pode
              ser renomeada nem excluída.
            </Note>
          </Topic>

          <Topic id="usuarios" screen="/users">
            <P>
              Quem pode entrar no sistema. Todos os usuários têm o mesmo
              acesso.
            </P>
            <ul className="flex flex-col gap-3 font-serif text-[17px] leading-relaxed">
              <Li>
                <Ui>Novo usuário</Ui>: informe nome, e-mail e uma senha de pelo
                menos {PASSWORD_MIN_LENGTH} caracteres. Passe a senha para a
                pessoa por um canal seguro, nunca em grupo.
              </Li>
              <Li>
                <Ui>Trocar a sua senha</Ui>: informe a senha atual e a nova duas
                vezes.
              </Li>
              <Li>
                <Ui>Redefinir a senha de outra pessoa</Ui>: para quem esqueceu a
                senha. Escolha a pessoa, crie uma senha nova e confirme com a sua
                própria senha.
              </Li>
              <Li>
                <Ui>Excluir</Ui>: a pessoa perde o acesso na hora, mas o que ela
                registrou continua no histórico.
              </Li>
            </ul>
          </Topic>

          <Topic id="duvidas">
            <Faq question="Esqueci a minha senha.">
              Peça para outra pessoa com acesso redefinir a sua senha na tela{" "}
              <ScreenLink href="/users">Usuários</ScreenLink>. Depois de entrar,
              troque por uma senha só sua.
            </Faq>
            <Faq question="O login diz que houve muitas tentativas.">
              Depois de várias senhas erradas seguidas, o login fica bloqueado
              por alguns minutos para proteger a conta. Espere a contagem na tela
              terminar e tente de novo.
            </Faq>
            <Faq question="Não encontro o botão Excluir.">
              Ele só aparece quando excluir não estraga o histórico: um item sem
              vendas, um bandeirante sem vendas nem contribuições, uma categoria
              que não está em uso. Transações da Lojinha e do Estoque são
              excluídas pela tela de origem.
            </Faq>
            <Faq question="Registrei uma venda errada.">
              Abra a venda e use <Ui>Excluir venda</Ui>, depois registre de novo.
              As unidades voltam ao estoque e as parcelas pagas saem das
              transações.
            </Faq>
            <Faq question="Um bandeirante pagou duas parcelas de uma vez.">
              Marque cada parcela como paga, uma de cada vez, com a mesma data.
            </Faq>
            <Faq question="O saldo do Painel não bate com o caixa.">
              Gere o relatório de Transações do período e compare linha por
              linha com o caixa ou o extrato. Lembre que compras de mercadoria
              registradas no Estoque também entram como saída.
            </Faq>
          </Topic>
        </div>
      </div>
    </Page>
  );
}

function Topic({
  id,
  screen,
  children,
}: {
  id: TopicId;
  // The screen this topic is about, linked from its heading
  screen?: string;
  children: React.ReactNode;
}) {
  const title = TOPICS.find((topic) => topic.id === id)!.title;

  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="flex scroll-mt-32 flex-col gap-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line pb-3">
        <h2 id={`${id}-title`} className="text-2xl tracking-[-0.02em] sm:text-[28px]">
          {title}
        </h2>
        {screen && (
          <Link href={screen} className={`${linkClass} text-sm`}>
            Abrir a tela
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

// A how-to inside a topic, set apart as a card
function Task({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={`flex flex-col gap-4 p-5 sm:p-6 ${cardClass}`}>
      <Eyebrow as="span">{title}</Eyebrow>
      {children}
    </div>
  );
}

function Faq({ question, children }: { question: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-[17px]">{question}</h3>
      <p className="font-serif text-[17px] leading-relaxed text-muted">{children}</p>
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="max-w-2xl font-serif text-[17px] leading-relaxed">{children}</p>;
}

function Li({ children }: { children: React.ReactNode }) {
  return <li className="ml-5 max-w-2xl list-disc marker:text-muted">{children}</li>;
}

function Steps({ children }: { children: React.ReactNode }) {
  return (
    <ol className="ml-5 flex max-w-2xl list-decimal flex-col gap-2 font-serif text-[17px] leading-relaxed marker:font-sans marker:text-muted">
      {children}
    </ol>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="max-w-2xl border-l-2 border-line pl-4 font-serif text-[15px] leading-relaxed text-muted">
      {children}
    </p>
  );
}

// A button, field or option name, written as it appears on screen
function Ui({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-[3px] border border-line bg-surface px-1.5 py-px font-sans text-[0.875em] whitespace-nowrap text-ink">
      {children}
    </span>
  );
}

// A word with a specific meaning in the app
function Term({ children }: { children: React.ReactNode }) {
  return <strong className="font-sans font-medium text-ink">{children}</strong>;
}

function ScreenLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-ink underline underline-offset-2">
      {children}
    </Link>
  );
}
