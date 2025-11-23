use aztec::macros::aztec;

#[aztec]
pub contract NFTBridge {
    use dep::aztec::{
        macros::{storage::storage, functions::{external, initializer}},
        protocol_types::{address::AztecAddress, address::EthAddress, hash::sha256_to_field},
        state_vars::{PublicImmutable},
    };
    use dep::NFTSubs::NFTSubs;

    #[storage]
    struct Storage<Context> {
        nft: PublicImmutable<AztecAddress, Context>,
        portal: PublicImmutable<EthAddress, Context>,
    }

    #[external("public")]
    #[initializer]
    fn constructor(nft: AztecAddress) {
        storage.nft.initialize(nft);
    }

    #[external("public")]
    fn set_portal(portal: EthAddress) {
        storage.portal.initialize(portal);
    }

    #[external("private")]
    fn claim(to: AztecAddress, sub_id: Field, secret: Field, message_leaf_index: Field) {
        // Compute the message hash that was sent from L1
        let sub_id_bytes: [u8; 32] = (sub_id as Field).to_be_bytes();
        let content_hash = sha256_to_field(sub_id_bytes);

        // Consume the L1 -> L2 message
        context.consume_l1_to_l2_message(
            content_hash,
            secret,
            storage.portal.read(),
            message_leaf_index
        );

        // Mint the NFT on L2
        let nft = storage.nft.read();
        NFTSubs::at(nft).mint(to, sub_id).call(&mut context);
    }

    #[external("private")]
    fn exit(
        sub_id: Field,
        recipient: EthAddress
    ) {
        // Create L2->L1 message to unlock NFT on L1
        let sub_id_bytes: [u8; 32] = sub_id.to_be_bytes();
        let recipient_bytes: [u8; 20] = recipient.to_be_bytes();
        let content = sha256_to_field(sub_id_bytes.concat(recipient_bytes));
        context.message_portal(storage.portal.read(), content);

        // Burn the NFT on L2
        let nft = storage.nft.read();
        NFTSubs::at(nft).burn(context.msg_sender().unwrap(), sub_id).call(&mut context);
    }
}