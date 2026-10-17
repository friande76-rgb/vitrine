# Testes de integração

`rls.sql` prova, contra um PostgreSQL a sério, que as políticas de segurança
fazem o que o `supabase/schema.sql` diz: um restaurante não vê nem altera os
pratos de outro, o público só vê o que está publicado, e as fotos só entram na
pasta do próprio restaurante.

```bash
createdb vitrine_test
psql "postgresql://…/vitrine_test" -v ON_ERROR_STOP=1 -f tests/integration/rls.sql
```

Cada `assert` que falhar interrompe o ficheiro com erro. No fim, imprime
`=== RLS OK ===`.

Nota: o ficheiro cria um arremedo mínimo dos objetos do Supabase de que o schema
depende (`auth.uid()`, `storage.objects`, papéis `authenticated` e `anon`), para
não ser preciso um projeto Supabase só para correr o teste.
