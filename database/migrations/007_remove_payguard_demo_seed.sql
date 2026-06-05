delete from payment_requests
where recipient_wallet = 'GDEMOAPPROVEDPAYGUARDWALLET000000000000000000000000'
   or agent_id in (
    select id
    from payment_agents
    where name in ('PayOps Analyst', 'Treasury Copilot', 'Blocked Payout Bot')
  );

delete from trusted_wallets
where wallet_address = 'GDEMOAPPROVEDPAYGUARDWALLET000000000000000000000000'
   or recipient_name = 'Proveedor verificado demo';

delete from payment_agents
where name in ('PayOps Analyst', 'Treasury Copilot', 'Blocked Payout Bot');
