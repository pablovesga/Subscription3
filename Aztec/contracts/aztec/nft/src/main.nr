use aztec::macros::aztec;
pub mod nft;

#[aztec]
pub contract NFTSubs {
    use dep::aztec::{
        macros::{storage::storage, functions::{external, initializer, internal}},
        protocol_types::{address::AztecAddress},
        state_vars::{PrivateSet, PublicImmutable, delayed_public_mutable::DelayedPublicMutable, Map}
    };
    use crate::nft::NFTNote;
    use dep::aztec::messages::message_delivery::MessageDelivery;
    use aztec::note::{note_getter_options::NoteGetterOptions, note_interface::NoteProperties, note_viewer_options::NoteViewerOptions};
    use aztec::utils::comparison::Comparator;

    #[storage]
    struct Storage<Context> {
        admin: PublicImmutable<AztecAddress, Context>,
        minter: PublicImmutable<AztecAddress, Context>,
        nfts: Map<Field, DelayedPublicMutable<bool, 2, Context>, Context>,
        owners: Map<AztecAddress, PrivateSet<NFTNote, Context>, Context>,
    }
    #[external("public")]
    #[initializer]
    fn constructor(admin: AztecAddress) {
        storage.admin.initialize(admin);
    }

    #[external("public")]
    #[internal]
    fn _mark_nft_exists(sub_id: Field, exists: bool) {
        storage.nfts.at(sub_id).schedule_value_change(exists);
    }

    #[external("utility")]
    unconstrained fn notes_of(from: AztecAddress) -> Field {
        let notes = storage.owners.at(from).view_notes(NoteViewerOptions::new());
        notes.len() as Field
    }

    #[external("public")]
    fn set_minter(minter: AztecAddress) {
        assert(storage.admin.read().eq(context.msg_sender().unwrap()), "caller is not admin");
        storage.minter.initialize(minter);
    }

    #[external("private")]
    fn mint(to: AztecAddress, sub_id: Field) {
        assert(storage.minter.read().eq(context.msg_sender().unwrap()), "caller is not the authorized minter");

        // we create an NFT note and insert it to the PrivateSet - a collection of notes meant to be read in private
        let new_nft = NFTNote::new(to, sub_id);
        storage.owners.at(to).insert(new_nft).emit( to, MessageDelivery.CONSTRAINED_ONCHAIN);

        // calling the internal public function above to indicate that the NFT is taken
        NFTSubs::at(context.this_address())._mark_nft_exists(sub_id, true).enqueue(&mut context);
    }

    #[external("private")]
    fn burn(from: AztecAddress, sub_id: Field) {
        assert(storage.minter.read().eq(context.msg_sender().unwrap()), "caller is not the authorized minter");

        // from the NFTNote properties, selects sub_id and compares it against the sub_id to be burned
        let options = NoteGetterOptions::new().select(NFTNote::properties().sub_id, Comparator.EQ, sub_id).set_limit(1);
        let notes = storage.owners.at(from).pop_notes(options);
        assert(notes.len() == 1, "NFT not found");

        NFTSubs::at(context.this_address())._mark_nft_exists(sub_id, false).enqueue(&mut context);
    }
}